import type { Express } from "express";
import { createServer, type Server } from "http";
import { login, getProfile, blockAccount } from "@/lib/bluesky";
import { db } from "@db";
import { users, blockList } from "@db/schema";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

declare module 'express-session' {
  interface SessionData {
    did: string;
  }
}

export function registerRoutes(app: Express): Server {
  const MemoryStoreSession = MemoryStore(session);

  app.use(session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStoreSession({
      checkPeriod: 86400000
    }),
    resave: false,
    saveUninitialized: false,
    secret: 'bluesky-blocklist-secret'
  }));

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      const auth = await login(identifier, password);

      if (!auth.did || !auth.handle) {
        throw new Error("Invalid authentication response");
      }

      const existingUser = await db.query.users.findFirst({
        where: eq(users.did, auth.did)
      });

      if (existingUser) {
        await db
          .update(users)
          .set({
            accessJwt: auth.accessJwt,
            refreshJwt: auth.refreshJwt
          })
          .where(eq(users.did, auth.did));
      } else {
        await db.insert(users).values([auth]);
      }

      req.session.did = auth.did;
      res.json({ success: true });
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ did: req.session.did });
  });

  app.get("/api/blocks", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const blocks = await db.query.blockList.findMany({
        orderBy: (blockList, { desc }) => [desc(blockList.createdAt)]
      });

      res.json(blocks);
    } catch (error) {
      console.error('Error fetching blocks:', error);
      res.status(500).json({ message: "Failed to fetch blocks" });
    }
  });

  app.delete("/api/blocks/:id", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const blockId = parseInt(req.params.id);
    if (isNaN(blockId)) {
      return res.status(400).json({ message: "Invalid block ID" });
    }

    try {
      const block = await db.query.blockList.findFirst({
        where: eq(blockList.id, blockId)
      });

      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }

      if (block.blockedByDid !== req.session.did) {
        return res.status(403).json({ message: "Not authorized to remove this block" });
      }

      await db.delete(blockList).where(eq(blockList.id, blockId));
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing block:', error);
      res.status(500).json({ message: "Failed to remove block" });
    }
  });

  app.post("/api/blocks/:id/report", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const blockId = parseInt(req.params.id);
    if (isNaN(blockId)) {
      return res.status(400).json({ message: "Invalid block ID" });
    }

    try {
      const block = await db.query.blockList.findFirst({
        where: eq(blockList.id, blockId)
      });

      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }

      await db
        .update(blockList)
        .set({
          reportCount: (block.reportCount || 0) + 1,
          isReported: true
        })
        .where(eq(blockList.id, blockId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error reporting block:', error);
      res.status(500).json({ message: "Failed to report block" });
    }
  });

  app.post("/api/blocks/import", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.did, req.session.did)
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    try {
      const { blocks } = await getProfile(user.accessJwt, user.refreshJwt, user.did, user.handle);
      console.log('Received blocks from Bluesky:', blocks);

      let importedCount = 0;
      if (blocks && Array.isArray(blocks)) {
        await Promise.all(
          blocks.map(async (block: any) => {
            try {
              const blockData = {
                did: block.did,
                handle: block.handle,
                blockedByDid: user.did
              };

              const existingBlock = await db.query.blockList.findFirst({
                where: eq(blockList.did, block.did)
              });

              if (!existingBlock) {
                await db.insert(blockList).values([blockData]);
                importedCount++;
              }
            } catch (error) {
              console.error('Error inserting block:', error);
            }
          })
        );
      }

      console.log(`Successfully imported ${importedCount} blocks`);
      res.json({ success: true, importedCount });
    } catch (error) {
      console.error('Import blocks error:', error);
      res.status(500).json({ message: "Failed to import blocks" });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.did, req.session.did)
      });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/blocks/reported", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.did, req.session.did)
      });

      if (!user?.isModerator) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const reportedBlocks = await db.query.blockList.findMany({
        where: eq(blockList.isReported, true),
        orderBy: (blockList, { desc }) => [desc(blockList.reportCount)]
      });

      res.json(reportedBlocks);
    } catch (error) {
      console.error('Error fetching reported blocks:', error);
      res.status(500).json({ message: "Failed to fetch reported blocks" });
    }
  });

  app.post("/api/blocks/:id/moderate", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const blockId = parseInt(req.params.id);
    if (isNaN(blockId)) {
      return res.status(400).json({ message: "Invalid block ID" });
    }

    const { status, notes } = req.body;
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid moderation status" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.did, req.session.did)
      });

      if (!user?.isModerator) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const block = await db.query.blockList.findFirst({
        where: eq(blockList.id, blockId)
      });

      if (!block) {
        return res.status(404).json({ message: "Block not found" });
      }

      await db
        .update(blockList)
        .set({
          moderationStatus: status,
          moderatedBy: user.did,
          moderationNotes: notes
        })
        .where(eq(blockList.id, blockId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error moderating block:', error);
      res.status(500).json({ message: "Failed to moderate block" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}