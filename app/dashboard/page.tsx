"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 backdrop-blur-md bg-black/60 border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Meet Chat</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-gray-300 text-xs sm:text-sm hidden sm:inline">
              {user?.firstName || user?.username || "ユーザー"}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-8 h-[calc(100vh-60px)] sm:h-[calc(100vh-72px)]">
        {viewMode === "record" ? (
          /* 録音画面 */
          <div className="h-full flex flex-col items-center justify-center">
            <div className="backdrop-blur-2xl bg-black/70 border border-white/5 rounded-2xl sm:rounded-3xl p-6 sm:p-12 shadow-2xl max-w-2xl w-full">
              <div className="text-center space-y-6 sm:space-y-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  音声録音
                </h2>
                <p className="text-gray-400 text-sm sm:text-base">
                  ボタンを押して録音を開始してください
                </p>

                {/* 録音ボタン */}
                <div className="flex justify-center py-6 sm:py-8">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center text-3xl sm:text-4xl transition-all duration-300 ${
                      isRecording
                        ? "bg-red-500/90 hover:bg-red-600/90 animate-pulse shadow-red-500/50"
                        : "bg-blue-500/90 hover:bg-blue-600/90 hover:scale-110 shadow-blue-500/50"
                    } backdrop-blur-sm shadow-2xl disabled:opacity-50 active:scale-95`}
                  >
                    {isRecording ? "⏹" : "🎤"}
                  </button>
                </div>

                {/* ステータス表示 */}
                <div className="text-center space-y-4">
                  {isRecording && (
                    <p className="text-red-400 font-semibold animate-pulse text-sm sm:text-base">
                      録音中...
                    </p>
                  )}
                  {isProcessing && (
                    <p className="text-blue-400 font-semibold text-sm sm:text-base">
                      文字起こし処理中...
                    </p>
                  )}
                </div>

                {/* 文字起こし結果 */}
                {transcription && !isProcessing && (
                  <div className="mt-6 sm:mt-8 space-y-4">
                    <div className="backdrop-blur-md bg-black/60 rounded-xl p-4 sm:p-6 border border-white/5 max-h-48 sm:max-h-64 overflow-y-auto">
                      <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">
                        文字起こし結果：
                      </h3>
                      <p className="text-gray-300 text-left whitespace-pre-wrap text-sm sm:text-base">
                        {transcription}
                      </p>
                    </div>
                    <button
                      onClick={switchToChat}
                      className="w-full bg-green-500/90 hover:bg-green-600/90 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-lg shadow-green-500/30 active:scale-98 text-sm sm:text-base"
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
            <div className="backdrop-blur-2xl bg-black/70 border border-white/5 rounded-2xl sm:rounded-3xl shadow-2xl h-full flex flex-col">
              {/* チャットヘッダー */}
              <div className="p-4 sm:p-6 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-bold text-white">AIチャット</h2>
                  <button
                    onClick={() => {
                      setViewMode("record");
                      setMessages([]);
                      setTranscription("");
                      setThreadId("");
                    }}
                    className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                  >
                    ← 戻る
                  </button>
                </div>
              </div>

              {/* メッセージ一覧 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 sm:px-6 sm:py-4 ${
                        msg.role === "user"
                          ? "bg-blue-500/90 text-white backdrop-blur-md shadow-lg shadow-blue-500/20"
                          : "bg-black/60 text-gray-100 backdrop-blur-md border border-white/5 shadow-lg"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm sm:text-base">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex justify-start">
                    <div className="bg-black/60 backdrop-blur-md border border-white/5 rounded-2xl px-4 py-3 sm:px-6 sm:py-4 shadow-lg">
                      <p className="text-gray-300 text-sm sm:text-base">入力中...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 入力フォーム */}
              <div className="p-4 sm:p-6 border-t border-white/5">
                <div className="flex gap-2 sm:gap-3">
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
                    className="flex-1 bg-black/60 backdrop-blur-md border border-white/5 rounded-xl px-4 py-3 sm:px-6 sm:py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-sm sm:text-base"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isProcessing || !inputMessage.trim()}
                    className="bg-blue-500/90 hover:bg-blue-600/90 text-white font-bold px-6 py-3 sm:px-8 sm:py-4 rounded-xl transition-all duration-300 backdrop-blur-sm disabled:opacity-50 shadow-lg shadow-blue-500/30 active:scale-95 text-sm sm:text-base"
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
