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

    // 分析エージェントを実行
    const response = await analysisAgent.generate(
      `以下の文字起こし内容を分析して、TODO、提案、重要なポイントを抽出してください：

${transcription}

回答は以下の形式でお願いします：

【TODO】
- （具体的なアクションアイテム）

【提案】
- （改善案やアイデア）

【重要なポイント】
- （決定事項や注意点）
`,
      {
        modelSettings: {
          temperature: 0.3, // 一貫性のある分析のため低めに設定
        },
      }
    );

    // テキストレスポンスを返す
    return NextResponse.json({
      analysis: response.text,
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

