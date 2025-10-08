import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 録音ファイル
  recordings: defineTable({
    userId: v.string(),
    audioUrl: v.string(),
    transcription: v.string(),
    duration: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // チャット履歴
  messages: defineTable({
    userId: v.string(),
    recordingId: v.optional(v.id("recordings")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),
});

