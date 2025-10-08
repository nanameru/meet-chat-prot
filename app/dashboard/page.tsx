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

// Web Speech API の型定義
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [viewMode, setViewMode] = useState<ViewMode>("record");
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string>("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

      // Web Speech APIでリアルタイム文字起こし
      startRealtimeTranscription();
    } catch (error) {
      console.error("録音エラー:", error);
      alert("マイクへのアクセスが拒否されました");
    }
  };

  // リアルタイム文字起こし開始
  const startRealtimeTranscription = () => {
    // Web Speech APIのサポート確認
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognitionClass) {
      console.warn("このブラウザは音声認識をサポートしていません");
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP'; // 日本語

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setTranscription(prev => prev + final);
      }
      setInterimTranscription(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('音声認識エラー:', event.error);
    };

    recognition.onend = () => {
      // 録音中なら再起動
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  };

  // 録音停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // リアルタイム文字起こしを停止
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      
      // 暫定的な文字起こしをクリア
      setInterimTranscription("");
    }
  };

  // 文字起こし（Whisperによる高精度版 - オプション）
  const transcribeAudio = async (audioBlob: Blob) => {
    // リアルタイム文字起こしで既にテキストがある場合は、Whisperはスキップ
    // 必要に応じて、Whisperで再度高精度な文字起こしを取得できます
    if (!transcription) {
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
      } catch (error) {
        console.error("文字起こしエラー:", error);
      } finally {
        setIsProcessing(false);
      }
    }

    // Convexに保存
    if (user && transcription) {
      try {
        await saveRecording({
          userId: user.id,
          audioUrl: "",
          transcription: transcription,
          duration: 0,
        });
      } catch (error) {
        console.error("保存エラー:", error);
      }
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
                <div className="space-y-2">
                  <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                    音声録音
                  </h2>
                  <p className="text-gray-400 text-sm sm:text-base">
                    {isRecording 
                      ? "録音中です。もう一度押すと停止します" 
                      : "ボタンを押して録音を開始してください"}
                  </p>
                </div>

                {/* 録音ボタン */}
                <div className="flex justify-center py-6 sm:py-8">
                  <div className="relative">
                    {/* 録音中の波形アニメーション */}
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                        <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse"></div>
                      </>
                    )}
                    
                    <button
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isProcessing}
                      className={`relative w-24 h-24 sm:w-32 sm:h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording
                          ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/50"
                          : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-110 shadow-lg shadow-blue-500/50"
                      } backdrop-blur-sm disabled:opacity-50 active:scale-95 group`}
                    >
                      {isRecording ? (
                        // 停止アイコン（四角形）
                        <svg
                          className="w-10 h-10 sm:w-12 sm:h-12 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="6" y="6" width="12" height="12" rx="2" />
                        </svg>
                      ) : (
                        // マイクアイコン
                        <svg
                          className="w-10 h-10 sm:w-12 sm:h-12 text-white group-hover:scale-110 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* リアルタイム文字起こし表示 */}
                {(isRecording || transcription || isProcessing) && (
                  <div className="mt-6 sm:mt-8 space-y-4">
                    {/* ステータス表示 */}
                    <div className="text-center">
                      {isRecording && (
                        <div className="flex items-center justify-center gap-3 text-red-400 font-semibold text-sm sm:text-base mb-4">
                          <div className="flex gap-1">
                            <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1 h-6 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1 h-5 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                          </div>
                          <span>録音中 - リアルタイム文字起こし</span>
                        </div>
                      )}
                      {isProcessing && !isRecording && (
                        <div className="flex items-center justify-center gap-3 text-blue-400 font-semibold text-sm sm:text-base mb-4">
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>保存中</span>
                        </div>
                      )}
                    </div>

                    {/* リアルタイム文字起こし結果 */}
                    {(transcription || interimTranscription) && (
                      <div className="backdrop-blur-md bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-4 sm:p-6 border border-white/10 min-h-[120px] max-h-64 overflow-y-auto shadow-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <h3 className="text-white font-semibold text-sm sm:text-base">
                            {isRecording ? "リアルタイム文字起こし" : "文字起こし結果"}
                          </h3>
                        </div>
                        <p className="text-gray-300 text-left whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                          {transcription}
                          {interimTranscription && (
                            <span className="text-gray-500 italic">{interimTranscription}</span>
                          )}
                          {isRecording && !transcription && !interimTranscription && (
                            <span className="text-gray-500 italic">話してください...</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AIチャット開始ボタン */}
                {transcription && !isRecording && !isProcessing && (
                  <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                      onClick={switchToChat}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 sm:py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 active:scale-98 text-sm sm:text-base flex items-center justify-center gap-2 group"
                    >
                      <span>AIチャットを開始</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
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
