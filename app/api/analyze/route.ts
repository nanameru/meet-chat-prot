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
      `以下の文字起こし内容を分析してください。必ず提供されているツールを使用して、構造化されたデータを生成してください：

【文字起こし内容】
${transcription}

【指示】
1. createTodoToolを使用してTODOを抽出
2. extractKeyPointsToolを使用して重要ポイントを抽出
3. suggestNextActionsToolを使用して次のアクションを提案
4. 各ツールを実行して、構造化されたデータを生成してください

必ずツールを実行して、その結果を報告してください。
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

    // toolCallsから結果を抽出
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        if (toolCall.toolName === "createTodo" && toolCall.result) {
          const result = toolCall.result as { todos?: typeof todos };
          if (result.todos) {
            todos.push(...result.todos);
          }
        } else if (toolCall.toolName === "extractKeyPoints" && toolCall.result) {
          const result = toolCall.result as { keyPoints?: typeof keyPoints };
          if (result.keyPoints) {
            keyPoints.push(...result.keyPoints);
          }
        } else if (toolCall.toolName === "suggestNextActions" && toolCall.result) {
          const result = toolCall.result as { nextActions?: typeof nextActions };
          if (result.nextActions) {
            nextActions.push(...result.nextActions);
          }
        }
      }
    }

    // 構造化データを返す
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

