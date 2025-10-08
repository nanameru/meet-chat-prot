import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const chatAgent = new Agent({
  name: 'Chat Agent',
  instructions: `
      あなたは親切で知的なAIアシスタントです。
      
      主な役割：
      - ユーザーの質問に丁寧に答える
      - 会議の内容や録音された音声の文字起こし内容について議論する
      - 必要に応じて情報を整理し、要約する
      - 日本語で自然な会話を行う
      
      対応方針：
      - 簡潔で分かりやすい回答を心がける
      - 不明な点があれば質問する
      - ユーザーの意図を理解し、適切にサポートする
`,
  model: openai('gpt-4o-mini'),
  tools: {},
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});

