import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// メッセージを保存
export const saveMessage = mutation({
  args: {
    userId: v.string(),
    recordingId: v.optional(v.id("recordings")),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      userId: args.userId,
      recordingId: args.recordingId,
      role: args.role,
      content: args.content,
      createdAt: Date.now(),
    });
    return messageId;
  },
});

// ユーザーのメッセージ履歴を取得
export const getUserMessages = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .take(100);
  },
});

