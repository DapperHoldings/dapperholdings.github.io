import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  did: text("did").notNull().unique(),
  accessJwt: text("access_jwt").notNull(),
  refreshJwt: text("refresh_jwt").notNull(),
  isModerator: boolean("is_moderator").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const blockList = pgTable("block_list", {
  id: serial("id").primaryKey(),
  did: text("did").notNull(),
  handle: text("handle").notNull(),
  blockedByDid: text("blocked_by_did").notNull(),
  isReported: boolean("is_reported").default(false).notNull(),
  reportCount: integer("report_count").default(0).notNull(),
  moderationStatus: text("moderation_status").default('pending').notNull(),
  moderatedBy: text("moderated_by"),
  moderationNotes: text("moderation_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const userSchema = createSelectSchema(users);
export const insertUserSchema = createInsertSchema(users);
export const blockListSchema = createSelectSchema(blockList);
export const insertBlockSchema = createInsertSchema(blockList);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type BlockedAccount = typeof blockList.$inferSelect;
export type InsertBlock = typeof blockList.$inferInsert;