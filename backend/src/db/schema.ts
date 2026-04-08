import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

//Enums
export const planEnum = pgEnum("plan", ["free", "pro"]);
export const sourceTypeEnum = pgEnum("source_type", ["url", "pdf", "note"]);
export const statusEnum = pgEnum("status", [
  "queued",
  "processing",
  "ready",
  "failed",
]);
export const linkTypeEnum = pgEnum("link_type", [
  "semantic",
  "tag_overlap",
  "manual",
]);

//Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  plan: planEnum("plan").default("free").notNull(),
  razorpayId: text("razorpay_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  lastDigestSentAt: timestamp("last_digest_sent_at"),
});

// Items 
export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url"),
    title: text("title").notNull(),
    contentMd: text("content_md").notNull(),
    summary: text("summary"),
    sourceType: sourceTypeEnum("source_type").notNull(),
    status: statusEnum("status").default("queued").notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    lastViewed: timestamp("last_viewed"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdCreatedAtIdx: index("items_user_id_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
    userIdStatusIdx: index("items_user_id_status_idx").on(
      table.userId,
      table.status,
    ),
  }),
);

//Chunks 
export const chunks = pgTable(
  "chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    chunkIdx: integer("chunk_idx").notNull(),
  },
  (table) => ({
    itemIdIdx: index("chunks_item_id_idx").on(table.itemId),
  }),
);

//Item Tags
export const itemTags = pgTable(
  "item_tags",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    tag: text("tag").notNull(),
    score: real("score").notNull(),
  },
  (table) => ({
    pk: uniqueIndex("item_tags_pk").on(table.itemId, table.tag),
    tagIdx: index("item_tags_tag_idx").on(table.tag),
  }),
);

//Item Links 
export const itemLinks = pgTable(
  "item_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    similarity: real("similarity").notNull(),
    linkType: linkTypeEnum("link_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueEdge: uniqueIndex("item_links_unique_edge").on(
      table.sourceId,
      table.targetId,
    ),
    userSourceIdx: index("item_links_user_source_idx").on(
      table.userId,
      table.sourceId,
    ),
    userTargetIdx: index("item_links_user_target_idx").on(
      table.userId,
      table.targetId,
    ),
  }),
);

//Resurface Scores
export const resurfaceScores = pgTable(
  "resurface_scores",
  {
    itemId: uuid("item_id")
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    decayScore: real("decay_score").notNull().default(0),
    relevance: real("relevance").notNull().default(0),
    lastSurfaced: timestamp("last_surfaced"),
    nextSurface: timestamp("next_surface"),
  },
  (table) => ({
    userNextSurfaceIdx: index("resurface_user_next_surface_idx").on(
      table.userId,
      table.nextSurface,
    ),
  }),
);
