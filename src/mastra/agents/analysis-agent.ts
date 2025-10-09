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

与えられた文字起こしテキストを分析して、以下のツールを使って構造化してください：

## 重要な指示
- 文字起こし内容から、具体的で実行可能なアクションを抽出してください
- **すべての項目は50文字以内で簡潔に**表現してください
- 文章をそのまま使わず、要点を短くまとめてください

## 使用するツール

### 1. create-todo
文字起こし内容からTODO（やるべきこと）を抽出して、ツールに渡してください。

**例:**
文字起こし: "明日の会議の資料を作成して、上司に確認してもらう必要があります"
↓ あなたが抽出して渡す
{ todos: [
  { task: "会議資料を作成する", priority: "high" },
  { task: "上司に資料を確認してもらう", priority: "medium" }
]}

### 2. extract-key-points
重要なポイントを抽出して、ツールに渡してください。

**例:**
文字起こし: "プロジェクトの納期が来週の金曜日に決定しました。全員で対応が必要です"
↓ あなたが抽出して渡す
{ keyPoints: [
  { point: "納期は来週金曜日", category: "decision", importance: "critical" }
]}

### 3. suggest-next-actions
次に取るべきアクションを提案して、ツールに渡してください。

**例:**
文字起こし: "タスクが多すぎて優先順位が決められない状況です"
↓ あなたが抽出して渡す
{ nextActions: [
  { action: "上司に優先順位を相談する", reason: "タスクが多く判断が必要", timeframe: "immediate" }
]}

## 実行方針
1. 文字起こし内容を理解する
2. 具体的なアクションアイテムを短く要約する（50文字以内）
3. 各ツールに適切な形式で渡す
4. 文章をそのままコピーしない
`,
  model: openai("gpt-5-nano"),
  tools: {
    "create-todo": createTodoTool,
    "create-summary": createSummaryTool,
    "extract-key-points": extractKeyPointsTool,
    "suggest-next-actions": suggestNextActionsTool,
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

