import { db } from "@db";
import { blockList } from "@db/schema";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";

const BLOCKLIST_PATH = path.join(process.cwd(), "docs", "community-blocklist.json");

interface BlockListEntry {
  handle: string;
  did: string;
  category: string;
  reason: string;
  date_added: string;
  reporter: string;
  evidence: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

export async function syncBlockList() {
  try {
    // Read existing community block list
    const content = await fs.readFile(BLOCKLIST_PATH, 'utf-8');
    const blockListData = JSON.parse(content);

    // Get all blocks from the database
    const dbBlocks = await db.query.blockList.findMany();

    // Update JSON with all blocks
    const newBlockListData = {
      ...blockListData,
      metadata: {
        ...blockListData.metadata,
        last_updated: new Date().toISOString().split('T')[0]
      },
      blocked_accounts: dbBlocks.map(block => ({
        handle: block.handle,
        did: block.did,
        category: block.category || "other",
        reason: block.reason || "Added to community block list",
        date_added: block.createdAt.toISOString().split('T')[0],
        reporter: block.blockedByDid,
        evidence: [{
          type: "user_block",
          description: `Blocked by Bluesky user`,
          timestamp: block.createdAt.toISOString()
        }]
      }))
    };

    // Write updated block list back to JSON
    await fs.writeFile(BLOCKLIST_PATH, JSON.stringify(newBlockListData, null, 2));

    // Sync from JSON to database to ensure consistency
    for (const block of blockListData.blocked_accounts) {
      const existingBlock = await db.query.blockList.findFirst({
        where: eq(blockList.did, block.did)
      });

      if (!existingBlock) {
        await db.insert(blockList).values({
          did: block.did,
          handle: block.handle,
          category: block.category,
          reason: block.reason,
          evidence: JSON.stringify(block.evidence),
          reportCount: 0,
          isReported: false,
          createdAt: new Date(block.date_added),
          blockedByDid: block.reporter
        });
      }
    }

    console.log("Block list sync completed successfully");
  } catch (error) {
    console.error("Error syncing block list:", error);
    throw error;
  }
}