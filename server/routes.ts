import type { Express } from "express";
import { createServer, type Server } from "http";
import { login, getProfile, blockAccount } from "@/lib/bluesky";
import { db } from "@db";
import { users, blockList } from "@db/schema";
import { eq, and } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";
import { syncBlockList } from "./lib/block-list-sync";
import * as fs from 'fs';
import * as path from 'path';

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
      // Get all blocks from all users
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

    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ message: "Report reason is required" });
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
          isReported: true,
          moderationNotes: `Reported: ${reason}`,
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
                blockedByDid: user.did,
                category: "other",
                reason: "Imported from Bluesky",
                evidence: JSON.stringify([{
                  type: "bluesky_import",
                  description: "Imported from user's Bluesky account",
                  timestamp: new Date().toISOString()
                }]),
                reportCount: 0,
                isReported: false,
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

      await syncBlockList();

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

  app.get("/api/blocks/community", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      await syncBlockList();
      const content = await fs.promises.readFile(path.join(process.cwd(), "docs", "community-blocklist.json"), 'utf-8');
      res.json(JSON.parse(content));
    } catch (error) {
      console.error('Error fetching community block list:', error);
      res.status(500).json({ message: "Failed to fetch community block list" });
    }
  });

  app.post("/api/blocks/community/sync", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.did, req.session.did)
    });

    if (!user?.isModerator) {
      return res.status(403).json({ message: "Not authorized" });
    }

    try {
      await syncBlockList();
      res.json({ success: true });
    } catch (error) {
      console.error('Error syncing community block list:', error);
      res.status(500).json({ message: "Failed to sync community block list" });
    }
  });

  app.post("/api/blocks", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { did, handle, reason } = req.body;
    if (!did || !handle) {
      return res.status(400).json({ message: "DID and handle are required" });
    }

    try {
      const blockData = {
        did,
        handle,
        blockedByDid: req.session.did,
        category: "other",
        reason: reason || "Added from community block list",
        evidence: JSON.stringify([{
          type: "user_block",
          description: "Added through community block list",
          timestamp: new Date().toISOString()
        }]),
        reportCount: 0,
        isReported: false,
      };

      const existingBlock = await db.query.blockList.findFirst({
        where: eq(blockList.did, did)
      });

      if (!existingBlock) {
        await db.insert(blockList).values([blockData]);
        await syncBlockList();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error adding block:', error);
      res.status(500).json({ message: "Failed to add block" });
    }
  });

  // Add new endpoint for syncing blocks to Bluesky
  app.post("/api/blocks/sync-to-bluesky", async (req, res) => {
    if (!req.session.did) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { blockIds } = req.body;
    if (!Array.isArray(blockIds)) {
      return res.status(400).json({ message: "Block IDs array is required" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.did, req.session.did)
      });

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      if (!user.accessJwt || !user.refreshJwt) {
        return res.status(401).json({ message: "Please log in again" });
      }

      const blocks = await db.query.blockList.findMany({
        where: and(
          eq(blockList.id, blockIds),
          eq(blockList.moderationStatus, 'approved')
        )
      });

      const results = await Promise.all(
        blocks.map(async (block) => {
          try {
            await blockAccount(user.accessJwt!, user.refreshJwt!, block.did);
            return { did: block.did, success: true };
          } catch (error) {
            console.error(`Failed to block account ${block.did}:`, error);
            return { did: block.did, success: false, error: (error as Error).message };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      const failedBlocks = results.filter(r => !r.success).map(r => ({ did: r.did, error: r.error }));

      res.json({ 
        success: true, 
        results: {
          total: results.length,
          succeeded: successCount,
          failed: failureCount,
          failedBlocks: failedBlocks
        }
      });
    } catch (error) {
      console.error('Error syncing blocks to Bluesky:', error);
      res.status(500).json({ message: "Failed to sync blocks to Bluesky" });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}