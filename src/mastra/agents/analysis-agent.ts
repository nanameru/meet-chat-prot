import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

/**
 * 分析エージェント
 * 文字起こし内容を分析してTODO、提案、重要ポイントを抽出
 */
export const analysisAgent = new Agent({
  name: "AnalysisAgent",
  description: "会議やミーティングの文字起こし内容を分析し、TODO、提案、重要ポイントを抽出する専門エージェント",
  instructions: `
あなたは会議やミーティングの文字起こし内容を分析する専門家です。

与えられた文字起こしテキストから以下を抽出してください：

1. **TODO（やるべきこと）**
   - 具体的なアクションアイテム
   - 誰が何をするべきか
   - 期限があれば含める

2. **提案（アイデアや改善案）**
   - 議論された改善案
   - 新しいアイデア
   - 検討事項

3. **重要なポイント**
   - 決定事項
   - 重要な議論
   - 注意すべき点

必ず日本語で、簡潔かつ明確に回答してください。
各項目は箇条書きで、実用的で具体的な内容にしてください。
`,
  model: openai("gpt-4o-mini"),
});

