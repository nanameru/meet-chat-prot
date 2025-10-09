import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import {
  createTodoTool,
  createSummaryTool,
  extractKeyPointsTool,
  suggestNextActionsTool,
} from "../tools/analysis-tools";

/**
 * 分析エージェント
 * 文字起こし内容を分析してTODO、提案、重要ポイントを抽出
 * 
 * 利用可能なツール：
 * - createTodoTool: TODO抽出・作成
 * - createSummaryTool: 要約作成
 * - extractKeyPointsTool: 重要ポイント抽出
 * - suggestNextActionsTool: ネクストアクション提案
 */
export const analysisAgent = new Agent({
  name: "AnalysisAgent",
  description: "会議やミーティングの文字起こし内容を分析し、TODO、提案、重要ポイントを抽出する専門エージェント",
  instructions: `
あなたは会議やミーティングの文字起こし内容を分析する専門家です。

以下のツールを活用して、与えられた文字起こしテキストを分析してください：

1. **createTodoTool** - TODO（やるべきこと）の抽出
   - 具体的なアクションアイテム
   - 担当者（わかる場合）
   - 期限（わかる場合）
   - 優先度の判断

2. **createSummaryTool** - 要約の作成
   - 内容の簡潔な要約
   - 主要なトピックの抽出

3. **extractKeyPointsTool** - 重要ポイントの抽出
   - 決定事項
   - 重要な議論
   - 注意すべき点
   - カテゴリー分け（決定/議論/警告/その他）

4. **suggestNextActionsTool** - ネクストアクションの提案
   - 次に取るべきアクション
   - 実施時期の判断（即座/短期/長期）
   - 推奨理由

**実行方針:**
- 文字起こし内容に応じて、適切なツールを使用してください
- 必ず日本語で、簡潔かつ明確に結果を報告してください
- 各項目は箇条書きで、実用的で具体的な内容にしてください
- ツールの実行結果を元に、わかりやすくまとめて提示してください

**出力フォーマット:**

【要約】
（createSummaryToolの結果）

【TODO】
（createTodoToolの結果を箇条書きで）
- タスク名 [優先度] (担当者) (期限)

【重要なポイント】
（extractKeyPointsToolの結果を箇条書きで）
- ポイント [カテゴリー] [重要度]

【ネクストアクション】
（suggestNextActionsToolの結果を箇条書きで）
- アクション [実施時期] - 理由
`,
  model: openai("gpt-5-nano"),
  tools: {
    createTodo: createTodoTool,
    createSummary: createSummaryTool,
    extractKeyPoints: extractKeyPointsTool,
    suggestNextActions: suggestNextActionsTool,
  },
  defaultGenerateOptions: {
    providerOptions: {
      openai: {
        // GPT-5 nanoは高スループット・シンプルな指示追従に最適
        // バックグラウンド処理なのでコストと速度を重視
        // 最小限の推論で高速実行
        reasoningEffort: "minimal",
        verbosity: "low",
      },
    },
  },
});

