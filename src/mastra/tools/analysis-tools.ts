import { createTool } from "@mastra/core/tools";
import { z } from "zod";

/**
 * TODO抽出・作成ツール
 */
export const createTodoTool = createTool({
  id: "create-todo",
  description: "文字起こし内容からTODO（やるべきこと）を抽出して構造化します",
  inputSchema: z.object({
    transcription: z.string().describe("分析対象の文字起こしテキスト"),
  }),
  outputSchema: z.object({
    todos: z.array(
      z.object({
        task: z.string().describe("具体的なタスク内容"),
        assignee: z.string().optional().describe("担当者（わかる場合）"),
        deadline: z.string().optional().describe("期限（わかる場合）"),
        priority: z.enum(["high", "medium", "low"]).describe("優先度"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { transcription } = context;
    
    // 実際のアプリケーションでは、ここでLLMを使って抽出するか、
    // または既にエージェントが判断した内容を構造化します
    
    // エージェント内で実行されるため、エージェントが判断した内容を返す
    const todos = [];
    const lines = transcription.split('\n');
    
    for (const line of lines) {
      // 「〜する」「〜すべき」「〜しよう」などのパターンを検出
      if (line.match(/する|すべき|しよう|やる|実施|対応|確認|チェック/)) {
        todos.push({
          task: line.trim().replace(/^[・•\-*]\s*/, ''),
          priority: "medium" as const,
        });
      }
    }
    
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
  description: "文字起こし内容から重要なポイントを抽出します",
  inputSchema: z.object({
    transcription: z.string().describe("分析対象の文字起こしテキスト"),
  }),
  outputSchema: z.object({
    keyPoints: z.array(
      z.object({
        point: z.string().describe("重要なポイント"),
        category: z.enum(["decision", "discussion", "warning", "other"]).describe("カテゴリー"),
        importance: z.enum(["critical", "high", "medium"]).describe("重要度"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { transcription } = context;
    
    const keyPoints = [];
    const lines = transcription.split('\n');
    
    for (const line of lines) {
      // 「決定」「重要」「注意」などのキーワードを検出
      if (line.match(/決定|重要|注意|確認|必須|必要|絶対/)) {
        let category: "decision" | "discussion" | "warning" | "other" = "other";
        let importance: "critical" | "high" | "medium" = "medium";
        
        if (line.match(/決定|決まった/)) {
          category = "decision";
          importance = "high";
        } else if (line.match(/注意|警告|気をつけ/)) {
          category = "warning";
          importance = "high";
        }
        
        keyPoints.push({
          point: line.trim().replace(/^[・•\-*]\s*/, ''),
          category,
          importance,
        });
      }
    }
    
    return { keyPoints };
  },
});

/**
 * ネクストアクション提案ツール
 */
export const suggestNextActionsTool = createTool({
  id: "suggest-next-actions",
  description: "文字起こし内容から次に取るべきアクションを提案します",
  inputSchema: z.object({
    transcription: z.string().describe("分析対象の文字起こしテキスト"),
  }),
  outputSchema: z.object({
    nextActions: z.array(
      z.object({
        action: z.string().describe("推奨アクション"),
        reason: z.string().describe("推奨理由"),
        timeframe: z.enum(["immediate", "short-term", "long-term"]).describe("実施時期"),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { transcription } = context;
    
    const nextActions = [];
    
    // 「次回」「今後」「次に」などのキーワードからアクションを抽出
    const lines = transcription.split('\n');
    for (const line of lines) {
      if (line.match(/次回|今後|次に|これから|将来|今すぐ|すぐに|早急に/)) {
        let timeframe: "immediate" | "short-term" | "long-term" = "short-term";
        
        if (line.match(/今すぐ|すぐに|早急に|至急/)) {
          timeframe = "immediate";
        } else if (line.match(/将来|長期|今後/)) {
          timeframe = "long-term";
        }
        
        nextActions.push({
          action: line.trim().replace(/^[・•\-*]\s*/, ''),
          reason: "文字起こし内容から抽出",
          timeframe,
        });
      }
    }
    
    return { nextActions };
  },
});

