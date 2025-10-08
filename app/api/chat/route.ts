import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { mastra } from "@/src/mastra";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, threadId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "No message provided" }, { status: 400 });
    }

    const chatAgent = mastra.getAgent("chatAgent");

    // threadIdが存在しない場合は新しいIDを生成
    const currentThreadId = threadId || randomUUID();

    // エージェントでメッセージを生成
    const response = await chatAgent.generate(message, {
      memory: {
        thread: currentThreadId,
        resource: userId, // ユーザーIDをresourceとして使用
      },
    });

    return NextResponse.json({
      text: response.text,
      threadId: currentThreadId,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Chat failed" },
      { status: 500 }
    );
  }
}

