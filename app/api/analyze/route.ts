import { NextRequest, NextResponse } from "next/server";
import { analysisAgent } from "@/src/mastra/agents/analysis-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 文字起こし内容を分析するAPIエンドポイント
 */
export async function POST(req: NextRequest) {
  try {
    const { transcription } = await req.json();

    if (!transcription || typeof transcription !== "string") {
      return NextResponse.json(
        { error: "文字起こしテキストが必要です" },
        { status: 400 }
      );
    }

    // 分析エージェントを実行（ツールを使って構造化データを生成）
    const response = await analysisAgent.generate(
      `以下の文字起こし内容を分析して、TODOや重要なポイント、次のアクションを抽出してください。

【文字起こし内容】
${transcription}

【重要】
- 文字起こし内容から具体的なアクションを**50文字以内で簡潔に**抽出してください
- 文章をそのままコピーせず、要点を短くまとめてください
- 必ず以下のツールを使って結果を記録してください：
  1. create-todo: やるべきことを抽出
  2. extract-key-points: 重要なポイントを抽出
  3. suggest-next-actions: 次のアクションを提案

【例】
文字起こし: "明日12時に登壇してその後にミーティングがあります"
→ TODO: "12時に登壇する"（文章全体ではなく、要点のみ）
`,
      {
        modelSettings: {
          temperature: 0.3, // 一貫性のある分析のため低めに設定
        },
      }
    );

    // ツール呼び出しの結果を抽出
    const todos: Array<{
      task: string;
      priority: "high" | "medium" | "low";
      assignee?: string;
      deadline?: string;
    }> = [];
    
    const keyPoints: Array<{
      point: string;
      category: "decision" | "discussion" | "warning" | "other";
      importance: "critical" | "high" | "medium";
    }> = [];
    
    const nextActions: Array<{
      action: string;
      reason: string;
      timeframe: "immediate" | "short-term" | "long-term";
    }> = [];

    // toolResultsから結果を抽出（Mastra 0.20.1+では toolCalls と toolResults が分離）
    console.log("Tool calls received:", response.toolCalls?.length || 0);
    console.log("Tool results received:", response.toolResults?.length || 0);
    
    if (response.toolResults && response.toolResults.length > 0) {
      for (const toolResult of response.toolResults) {
        const toolName = toolResult.payload?.toolName;
        const result = toolResult.payload?.result;
        
        console.log("Processing tool result:", toolName);
        
        if (toolName === "create-todo" && result) {
          const typedResult = result as { todos?: typeof todos };
          if (typedResult.todos) {
            todos.push(...typedResult.todos);
          }
        } else if (toolName === "extract-key-points" && result) {
          const typedResult = result as { keyPoints?: typeof keyPoints };
          if (typedResult.keyPoints) {
            keyPoints.push(...typedResult.keyPoints);
          }
        } else if (toolName === "suggest-next-actions" && result) {
          const typedResult = result as { nextActions?: typeof nextActions };
          if (typedResult.nextActions) {
            nextActions.push(...typedResult.nextActions);
          }
        }
      }
    }

    // 構造化データを返す
    console.log("Analysis results:", { 
      todosCount: todos.length, 
      keyPointsCount: keyPoints.length, 
      nextActionsCount: nextActions.length 
    });
    
    return NextResponse.json({
      todos,
      keyPoints,
      nextActions,
      summary: response.text,
      success: true,
    });
  } catch (error) {
    console.error("分析エラー:", error);
    return NextResponse.json(
      {
        error: "分析中にエラーが発生しました",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

