import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * TODO抽出・作成ツール
 */
export const createTodoTool = createTool({
  id: "create-todo",
  description: "抽出したTODO（やるべきこと）を構造化して記録します。各タスクは50文字以内で簡潔に表現してください。",
  inputSchema: z.object({
    todos: z.array(
      z.object({
        task: z.string().max(50).describe("具体的なタスク内容（50文字以内で簡潔に）例: 上司に優先順位を相談する"),
        assignee: z.string().optional().describe("担当者（わかる場合）"),
        deadline: z.string().optional().describe("期限（わかる場合）"),
        priority: z.enum(["high", "medium", "low"]).describe("優先度"),
      })
    ).describe("抽出したTODOのリスト"),
  }),
  outputSchema: z.object({
    todos: z.array(
      z.object({
        task: z.string().max(50).describe("具体的なタスク内容（50文字以内で簡潔に）"),
        assignee: z.string().optional().describe("担当者（わかる場合）"),
        deadline: z.string().optional().describe("期限（わかる場合）"),
        priority: z.enum(["high", "medium", "low"]).describe("優先度"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { todos } = context;
    
    // AIが既に判断して渡した内容をそのまま返す
    return { todos };
  },
});

/**
 * 要約作成ツール
 */
export const createSummaryTool = createTool({
  id: "create-summary",
  description: "文字起こし内容を簡潔に要約します",
  inputSchema: z.object({
    transcription: z.string().describe("要約対象の文字起こしテキスト"),
    maxLength: z.number().optional().describe("要約の最大文字数（デフォルト: 200）"),
  }),
  outputSchema: z.object({
    summary: z.string().describe("要約されたテキスト"),
    keyTopics: z.array(z.string()).describe("主要なトピック"),
  }),
  execute: async ({ context }) => {
    const { transcription, maxLength = 200 } = context;
    
    // エージェントが生成した要約を構造化
    const summary = transcription.substring(0, maxLength) + "...";
    const keyTopics: string[] = [];
    
    return { summary, keyTopics };
  },
});

/**
 * 重要ポイント抽出ツール
 */
export const extractKeyPointsTool = createTool({
  id: "extract-key-points",
  description: "抽出した重要なポイントを構造化して記録します。各ポイントは50文字以内で簡潔に表現してください。",
  inputSchema: z.object({
    keyPoints: z.array(
      z.object({
        point: z.string().max(50).describe("重要なポイント（50文字以内で簡潔に）例: 明日12時に登壇する"),
        category: z.enum(["decision", "discussion", "warning", "other"]).describe("カテゴリー"),
        importance: z.enum(["critical", "high", "medium"]).describe("重要度"),
      })
    ).describe("抽出した重要ポイントのリスト"),
  }),
  outputSchema: z.object({
    keyPoints: z.array(
      z.object({
        point: z.string().max(50).describe("重要なポイント（50文字以内で簡潔に）"),
        category: z.enum(["decision", "discussion", "warning", "other"]).describe("カテゴリー"),
        importance: z.enum(["critical", "high", "medium"]).describe("重要度"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { keyPoints } = context;
    
    // AIが既に判断して渡した内容をそのまま返す
    return { keyPoints };
  },
});

/**
 * ネクストアクション提案ツール
 */
export const suggestNextActionsTool = createTool({
  id: "suggest-next-actions",
  description: "抽出した次に取るべきアクションを構造化して記録します。各アクションは50文字以内で簡潔に表現してください。",
  inputSchema: z.object({
    nextActions: z.array(
      z.object({
        action: z.string().max(50).describe("推奨アクション（50文字以内で簡潔に）例: 上司に優先順位を相談する"),
        reason: z.string().max(50).describe("推奨理由（50文字以内で簡潔に）例: タスクが多く判断が必要"),
        timeframe: z.enum(["immediate", "short-term", "long-term"]).describe("実施時期"),
      })
    ).describe("抽出したネクストアクションのリスト"),
  }),
  outputSchema: z.object({
    nextActions: z.array(
      z.object({
        action: z.string().max(50).describe("推奨アクション（50文字以内で簡潔に）"),
        reason: z.string().max(50).describe("推奨理由（50文字以内で簡潔に）"),
        timeframe: z.enum(["immediate", "short-term", "long-term"]).describe("実施時期"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { nextActions } = context;
    
    // AIが既に判断して渡した内容をそのまま返す
    return { nextActions };
  },
});

