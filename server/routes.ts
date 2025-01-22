import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, blockedAccounts, blockListSubscriptions, blockCategories } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { BskyAgent } from '@atproto/api';
import session from 'express-session';
import MemoryStore from 'memorystore';

const agent = new BskyAgent({
  service: 'https://bsky.social'
});

const MemoryStoreSession = MemoryStore(session);

async function propagateBlock(db: any, blockData: { did: string; handle: string; reason?: string }, excludeUserId: number) {
  // Get all users except the one who created the block
  const connectedUsers = await db.query.users.findMany({
    where: eq(users.id, excludeUserId, 'not'),  // Exclude the user who created the block
  });

  console.log(`Found ${connectedUsers.length} connected users to propagate block to`);

  for (const user of connectedUsers) {
    try {
      // Create a new agent instance for this block operation
      const blockAgent = new BskyAgent({
        service: 'https://bsky.social'
      });

      // Resume the user's session
      await blockAgent.resumeSession({
        did: user.did,
        handle: user.handle,
        accessJwt: user.accessJwt,
        refreshJwt: user.refreshJwt,
        email: '',
        emailConfirmed: false,
        active: true,
      });

      // Create the block on BlueSky
      await blockAgent.api.app.bsky.graph.block.create({
        repo: user.did,
        record: {
          subject: blockData.did,
          createdAt: new Date().toISOString(),
          '$type': 'app.bsky.graph.block',
        },
      });

      // Add the block to our database
      await db.insert(blockedAccounts).values({
        did: blockData.did,
        handle: blockData.handle,
        reason: `Auto-blocked: ${blockData.reason || 'Blocked by S.H.I.E.L.D. firewall'}`,
        blockedById: user.id,
      });

      console.log(`Successfully propagated block of ${blockData.handle} to user ${user.handle}`);
    } catch (error) {
      console.error(`Failed to propagate block to user ${user.handle}:`, error);
      continue; // Continue with other users even if one fails
    }
  }
}

// When a new user authenticates, apply all existing blocks
async function applyExistingBlocks(db: any, newUser: { id: number; did: string; handle: string; accessJwt: string; refreshJwt: string }) {
  console.log(`Applying existing blocks to new user: ${newUser.handle}`);

  try {
    // Get all unique blocks from the database
    const existingBlocks = await db.query.blockedAccounts.findMany({
      where: eq(blockedAccounts.did, newUser.did, 'not'),  // Exclude self-blocks
    });

    // Remove duplicates by did
    const uniqueBlocks = Array.from(
      new Map(existingBlocks.map(block => [block.did, block])).values()
    );

    console.log(`Found ${uniqueBlocks.length} existing blocks to apply`);

    const blockAgent = new BskyAgent({
      service: 'https://bsky.social'
    });

    // Resume the user's session
    await blockAgent.resumeSession({
      did: newUser.did,
      handle: newUser.handle,
      accessJwt: newUser.accessJwt,
      refreshJwt: newUser.refreshJwt,
      email: '',
      emailConfirmed: false,
      active: true,
    });

    for (const block of uniqueBlocks) {
      try {
        // Create the block on BlueSky
        await blockAgent.api.app.bsky.graph.block.create({
          repo: newUser.did,
          record: {
            subject: block.did,
            createdAt: new Date().toISOString(),
            '$type': 'app.bsky.graph.block',
          },
        });

        // Add the block to our database
        await db.insert(blockedAccounts).values({
          did: block.did,
          handle: block.handle,
          reason: 'Applied by S.H.I.E.L.D. firewall on connection',
          blockedById: newUser.id,
        });

        console.log(`Applied existing block of ${block.handle} to new user ${newUser.handle}`);
      } catch (error) {
        console.error(`Failed to apply block ${block.handle} to new user ${newUser.handle}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.error(`Failed to apply existing blocks to user ${newUser.handle}:`, error);
    throw error;
  }
}

export function registerRoutes(app: Express): Server {
  const httpServer = createServer(app);

  // Setup session middleware
  app.use(
    session({
      cookie: { maxAge: 86400000 },
      store: new MemoryStoreSession({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      resave: false,
      secret: 'your-secret-key',
      saveUninitialized: false,
    })
  );

  // Get current user
  app.get("/api/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Auth endpoints
  app.post("/api/auth", async (req, res) => {
    const { did, handle, accessJwt, refreshJwt } = req.body;
    try {
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.did, did),
      });

      let user;

      if (existingUser) {
        // Update existing user
        const updated = await db
          .update(users)
          .set({ accessJwt, refreshJwt, handle })
          .where(eq(users.did, did))
          .returning();
        user = updated[0];
      } else {
        // Create new user
        const created = await db
          .insert(users)
          .values({
            did,
            handle,
            accessJwt,
            refreshJwt,
          })
          .returning();
        user = created[0];

        // Apply existing blocks to new user
        await applyExistingBlocks(db, user);
      }

      // Set user ID in session
      req.session.userId = user.id;

      res.json(user);
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ error: "Failed to authenticate user" });
    }
  });

  // Block list management
  app.get("/api/blocks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const blocks = await db.query.blockedAccounts.findMany({
        where: eq(blockedAccounts.blockedById, req.session.userId),
        with: {
          blockedBy: true,
          category: true,
        },
      });
      res.json(blocks);
    } catch (error) {
      console.error("Get blocks error:", error);
      res.status(500).json({ error: "Failed to fetch blocks" });
    }
  });

  // Add a new endpoint to get community blocks (all blocks in the system)
  app.get("/api/blocks/community", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const blocks = await db.query.blockedAccounts.findMany({
        with: {
          blockedBy: true,
          category: true,
        },
      });
      res.json(blocks);
    } catch (error) {
      console.error("Get community blocks error:", error);
      res.status(500).json({ error: "Failed to fetch community blocks" });
    }
  });

  // Add new endpoint to toggle auto-block
  app.post("/api/settings/auto-block", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: "Invalid enabled value" });
    }

    try {
      const updated = await db
        .update(users)
        .set({ autoBlockEnabled: enabled })
        .where(eq(users.id, req.session.userId))
        .returning();

      res.json(updated[0]);
    } catch (error) {
      console.error("Update auto-block settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });


  // Update the block creation endpoint to handle auto-blocking
  app.post("/api/blocks", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { did, handle, reason } = req.body;
    if (!did || !handle) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      // Get current user
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Prevent self-blocking
      if (did === user.did) {
        console.log(`Self-block prevention: User ${user.handle} attempted to block their own account`);
        return res.status(400).json({
          error: "Self-blocking prevented",
          message: "You cannot block your own account.",
        });
      }

      // Create the block in our database
      const [block] = await db
        .insert(blockedAccounts)
        .values({
          did,
          handle,
          reason,
          blockedById: req.session.userId,
        })
        .returning();

      // Propagate the block to other users who have auto-block enabled
      await propagateBlock(db, { did, handle, reason }, req.session.userId);

      res.json(block);
    } catch (error) {
      console.error("Add block error:", error);
      res.status(500).json({ error: "Failed to add block" });
    }
  });

  app.delete("/api/blocks/:id", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    try {
      await db.delete(blockedAccounts).where(eq(blockedAccounts.id, parseInt(id)));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete block error:", error);
      res.status(500).json({ error: "Failed to remove block" });
    }
  });

  // Update the sync endpoint with improved block creation
  app.post("/api/blocks/sync", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      // Get current user
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.session.userId),
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create a new agent instance for this sync
      const syncAgent = new BskyAgent({
        service: 'https://bsky.social'
      });

      // Resume BlueSky session
      try {
        await syncAgent.resumeSession({
          did: user.did,
          handle: user.handle,
          accessJwt: user.accessJwt,
          refreshJwt: user.refreshJwt,
          email: '',
          emailConfirmed: false,
          active: true,
        });
      } catch (error) {
        console.error("BlueSky session resume error:", error);
        return res.status(401).json({
          error: "Failed to authenticate with BlueSky. Please try logging in again.",
          details: error.message
        });
      }

      console.log(`\nStarting two-way sync for user: ${user.handle} (${user.did})`);

      // Step 1: Get blocks from BlueSky
      let bskyBlocks = [];
      let cursor;

      do {
        try {
          const response = await syncAgent.api.app.bsky.graph.getBlocks({
            limit: 100,
            cursor,
          });

          if (!response.success) {
            throw new Error('Failed to fetch blocks from BlueSky API');
          }

          bskyBlocks = [...bskyBlocks, ...response.data.blocks];
          cursor = response.data.cursor;

          console.log(`Fetched batch of ${response.data.blocks.length} blocks from BlueSky`);
        } catch (error) {
          console.error("Error fetching block batch:", error);
          throw new Error(`Failed to fetch blocks from BlueSky: ${error.message}`);
        }
      } while (cursor);

      console.log(`\nTotal blocks fetched from BlueSky: ${bskyBlocks.length}`);

      // Step 2: Add BlueSky blocks to our database
      let newlyAdded = 0;
      let existing = 0;
      let selfBlocksFiltered = 0;

      for (const block of bskyBlocks) {
        try {
          // Skip self-blocks
          if (block.did === user.did) {
            selfBlocksFiltered++;
            console.log(`Skipping self-block: ${block.handle} (${block.did})`);
            continue;
          }

          const existingBlock = await db.query.blockedAccounts.findFirst({
            where: and(
              eq(blockedAccounts.did, block.did),
              eq(blockedAccounts.blockedById, user.id)
            ),
          });

          if (!existingBlock) {
            await db.insert(blockedAccounts)
              .values({
                did: block.did,
                handle: block.handle,
                blockedById: user.id,
                reason: "Imported from BlueSky",
              });
            newlyAdded++;
            console.log(`Added BlueSky block to database: ${block.handle} (${block.did})`);
          } else {
            existing++;
            console.log(`Skip existing block: ${block.handle} (${block.did})`);
          }
        } catch (error) {
          console.error(`Error processing block ${block.handle} (${block.did}):`, error);
        }
      }

      // Step 3: Get all community blocks from our database
      const communityBlocks = await db.query.blockedAccounts.findMany({
        where: and(
          eq(blockedAccounts.blockedById, user.id, 'not'),  // Exclude user's own blocks
          eq(blockedAccounts.did, user.did, 'not')  // Exclude self-blocks
        ),
      });

      console.log(`\nFound ${communityBlocks.length} community blocks to sync`);

      // Step 4: Add missing blocks to BlueSky
      let addedToBsky = 0;
      let existingInBsky = 0;
      let failedToAdd = 0;

      for (const block of communityBlocks) {
        try {
          // Check if already blocked on BlueSky
          const isBlocked = bskyBlocks.some(b => b.did === block.did);

          if (!isBlocked) {
            // Block the account on BlueSky
            await syncAgent.api.app.bsky.graph.block.create({
              repo: user.did,
              record: {
                subject: block.did,
                createdAt: new Date().toISOString(),
                '$type': 'app.bsky.graph.block',
              },
            });
            addedToBsky++;
            console.log(`Added block to BlueSky: ${block.handle} (${block.did})`);
          } else {
            existingInBsky++;
            console.log(`Skip existing BlueSky block: ${block.handle} (${block.did})`);
          }
        } catch (error) {
          failedToAdd++;
          console.error(`Failed to add block to BlueSky: ${block.handle} (${block.did})`, error);
        }
      }

      // Update last synced timestamp
      await db
        .update(blockListSubscriptions)
        .set({ lastSynced: new Date() })
        .where(eq(blockListSubscriptions.userId, user.id));

      // Create subscription if it doesn't exist
      const subscription = await db.query.blockListSubscriptions.findFirst({
        where: eq(blockListSubscriptions.userId, user.id),
      });

      if (!subscription) {
        await db.insert(blockListSubscriptions).values({
          userId: user.id,
          active: true,
        });
      }

      const summary = {
        totalFetched: bskyBlocks.length,
        newlyAdded,
        existing,
        selfBlocksFiltered,
        addedToBsky,
        existingInBsky,
        failedToAdd,
        communityBlocksFound: communityBlocks.length
      };

      console.log("\nSync summary:", summary);

      res.json({
        success: true,
        ...summary
      });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({
        error: "Failed to sync blocks. Please try again.",
        details: error.message
      });
    }
  });

  // Category management endpoints
  app.get("/api/categories", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const categories = await db.query.blockCategories.findMany({
        where: eq(blockCategories.createdById, req.session.userId),
      });
      res.json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    try {
      const category = await db
        .insert(blockCategories)
        .values({
          name,
          description,
          createdById: req.session.userId,
        })
        .returning();
      res.json(category[0]);
    } catch (error) {
      console.error("Create category error:", error);
      res.status(500).json({ error: "Failed to create category" });
    }
  });

  // Update block endpoint to support categories
  app.patch("/api/blocks/:id/category", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { categoryId } = req.body;

    try {
      const block = await db
        .update(blockedAccounts)
        .set({ categoryId })
        .where(
          and(
            eq(blockedAccounts.id, parseInt(id)),
            eq(blockedAccounts.blockedById, req.session.userId)
          )
        )
        .returning();
      res.json(block[0]);
    } catch (error) {
      console.error("Update block category error:", error);
      res.status(500).json({ error: "Failed to update block category" });
    }
  });

  // Add this endpoint after the other block management endpoints
  app.patch("/api/blocks/:id/reason", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const { reason } = req.body;

    try {
      const block = await db
        .update(blockedAccounts)
        .set({ reason })
        .where(
          and(
            eq(blockedAccounts.id, parseInt(id)),
            eq(blockedAccounts.blockedById, req.session.userId)
          )
        )
        .returning();
      res.json(block[0]);
    } catch (error) {
      console.error("Update block reason error:", error);
      res.status(500).json({ error: "Failed to update block reason" });
    }
  });

  return httpServer;
}