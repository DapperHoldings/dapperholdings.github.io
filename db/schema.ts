import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  did: text("did").notNull().unique(),
  handle: text("handle").notNull(),
  accessJwt: text("access_jwt").notNull(),
  refreshJwt: text("refresh_jwt").notNull(),
  autoBlockEnabled: boolean("auto_block_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const blockCategories = pgTable("block_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedAccounts = pgTable("blocked_accounts", {
  id: serial("id").primaryKey(),
  did: text("did").notNull(),
  handle: text("handle").notNull(),
  reason: text("reason"),
  categoryId: integer("category_id").references(() => blockCategories.id),
  blockedById: integer("blocked_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockListSubscriptions = pgTable("block_list_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  lastSynced: timestamp("last_synced").defaultNow(),
  active: boolean("active").default(true),
});

export const userRelations = relations(users, ({ many }) => ({
  blockedAccounts: many(blockedAccounts),
  subscriptions: many(blockListSubscriptions),
  categories: many(blockCategories),
}));

export const blockedAccountsRelations = relations(blockedAccounts, ({ one }) => ({
  blockedBy: one(users, {
    fields: [blockedAccounts.blockedById],
    references: [users.id],
  }),
  category: one(blockCategories, {
    fields: [blockedAccounts.categoryId],
    references: [blockCategories.id],
  }),
}));

export const blockCategoriesRelations = relations(blockCategories, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [blockCategories.createdById],
    references: [users.id],
  }),
  blockedAccounts: many(blockedAccounts),
}));

export type User = typeof users.$inferSelect;
export type BlockedAccount = typeof blockedAccounts.$inferSelect;
export type BlockListSubscription = typeof blockListSubscriptions.$inferSelect;
export type BlockCategory = typeof blockCategories.$inferSelect;

export const insertUserSchema = createInsertSchema(users);
export const insertBlockedAccountSchema = createInsertSchema(blockedAccounts);
export const insertSubscriptionSchema = createInsertSchema(blockListSubscriptions);
export const insertBlockCategorySchema = createInsertSchema(blockCategories);