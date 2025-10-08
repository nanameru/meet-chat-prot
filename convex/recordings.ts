import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// 録音を保存
export const saveRecording = mutation({
  args: {
    userId: v.string(),
    audioUrl: v.string(),
    transcription: v.string(),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const recordingId = await ctx.db.insert("recordings", {
      userId: args.userId,
      audioUrl: args.audioUrl,
      transcription: args.transcription,
      duration: args.duration,
      createdAt: Date.now(),
    });
    return recordingId;
  },
});

// ユーザーの録音履歴を取得
export const getUserRecordings = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recordings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);
  },
});

