"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type ViewMode = "record" | "chat";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const saveRecording = useMutation(api.recordings.saveRecording);

  // 録音開始
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("録音エラー:", error);
      alert("マイクへのアクセスが拒否されました");
    }
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 文字起こし
  const transcribeAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setTranscription(data.text);

      // Convexに保存
      if (user) {
        await saveRecording({
          userId: user.id,
          audioUrl: "", // 必要に応じてストレージに保存
          transcription: data.text,
          duration: 0,
        });
      }
    } catch (error) {
      console.error("文字起こしエラー:", error);
      alert("文字起こしに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  // チャット送信
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: "user",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          threadId: threadId || undefined,
        }),
      });

      const data = await response.json();
      
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("チャットエラー:", error);
      alert("メッセージの送信に失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  // チャット画面に切り替え
  const switchToChat = () => {
    setViewMode("chat");
    if (transcription) {
      // 文字起こし結果を最初のメッセージとして追加
      setMessages([
        {
          role: "user",
          content: `以下は録音した音声の文字起こし結果です：\n\n${transcription}`,
        },
      ]);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 backdrop-blur-sm bg-black/20 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Meet Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300 text-sm">
              {user?.firstName || user?.username || "ユーザー"}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="relative z-10 container mx-auto px-6 py-8 h-[calc(100vh-80px)]">
        {viewMode === "record" ? (
          /* 録音画面 */
          <div className="h-full flex flex-col items-center justify-center">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-12 shadow-2xl max-w-2xl w-full">
              <div className="text-center space-y-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  音声録音
                </h2>
                <p className="text-gray-400">
                  ボタンを押して録音を開始してください
                </p>

                {/* 録音ボタン */}
                <div className="flex justify-center py-8">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl transition-all duration-300 ${
                      isRecording
                        ? "bg-red-500/80 hover:bg-red-600/80 animate-pulse"
                        : "bg-blue-500/80 hover:bg-blue-600/80 hover:scale-110"
                    } backdrop-blur-sm shadow-2xl disabled:opacity-50`}
                  >
                    {isRecording ? "⏹" : "🎤"}
                  </button>
                </div>

                {/* ステータス表示 */}
                <div className="text-center space-y-4">
                  {isRecording && (
                    <p className="text-red-400 font-semibold animate-pulse">
                      録音中...
                    </p>
                  )}
                  {isProcessing && (
                    <p className="text-blue-400 font-semibold">
                      文字起こし処理中...
                    </p>
                  )}
                </div>

                {/* 文字起こし結果 */}
                {transcription && !isProcessing && (
                  <div className="mt-8 space-y-4">
                    <div className="backdrop-blur-sm bg-white/10 rounded-xl p-6 border border-white/10">
                      <h3 className="text-white font-semibold mb-3">
                        文字起こし結果：
                      </h3>
                      <p className="text-gray-300 text-left whitespace-pre-wrap">
                        {transcription}
                      </p>
                    </div>
                    <button
                      onClick={switchToChat}
                      className="w-full bg-green-500/80 hover:bg-green-600/80 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 backdrop-blur-sm"
                    >
                      AIチャットを開始
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* チャット画面 */
          <div className="h-full flex flex-col">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl shadow-2xl h-full flex flex-col">
              {/* チャットヘッダー */}
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">AIチャット</h2>
                  <button
                    onClick={() => {
                      setViewMode("record");
                      setMessages([]);
                      setTranscription("");
                      setThreadId("");
                    }}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    ← 戻る
                  </button>
                </div>
              </div>

              {/* メッセージ一覧 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-6 py-4 ${
                        msg.role === "user"
                          ? "bg-blue-500/80 text-white backdrop-blur-sm"
                          : "bg-white/10 text-gray-100 backdrop-blur-sm border border-white/10"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-4">
                      <p className="text-gray-300">入力中...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 入力フォーム */}
              <div className="p-6 border-t border-white/10">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="メッセージを入力..."
                    disabled={isProcessing}
                    className="flex-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isProcessing || !inputMessage.trim()}
                    className="bg-blue-500/80 hover:bg-blue-600/80 text-white font-bold px-8 py-4 rounded-xl transition-all duration-300 backdrop-blur-sm disabled:opacity-50"
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
