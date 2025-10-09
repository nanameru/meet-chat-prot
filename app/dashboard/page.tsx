"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AnalysisResult {
  analysis: string;
  timestamp: number;
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
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [interimTranscription, setInterimTranscription] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [threadId, setThreadId] = useState<string>("");
  
  // 分析機能用の状態
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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

  // 分析実行
  const analyzeTranscription = async (text: string) => {
    if (isAnalyzing || !text || text.length < 100) return;

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: text }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysisResult({
        analysis: data.analysis,
        timestamp: Date.now(),
      });
      
      setLastAnalyzedLength(text.length);
    } catch (error) {
      console.error("分析エラー:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 100文字ごとに自動分析
  useEffect(() => {
    const currentLength = transcription.length;
    const nextThreshold = Math.floor(lastAnalyzedLength / 100) * 100 + 100;
    
    // 100文字を超えていて、まだ分析していない場合
    if (currentLength >= nextThreshold && !isAnalyzing && !isRecording) {
      analyzeTranscription(transcription);
    }
  }, [transcription, lastAnalyzedLength, isAnalyzing, isRecording]);

  // クイックアクション（定型質問）
  const sendQuickAction = async (question: string) => {
    const userMessage: Message = {
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsSendingChat(true);

    try {
      // 最初のメッセージの場合、文字起こし内容をコンテキストとして含める
      let messageToSend = question;
      if (messages.length === 0 && transcription) {
        messageToSend = `以下は音声録音の文字起こし結果です：\n\n「${transcription}」\n\n---\n\nユーザーからの質問: ${question}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          threadId: threadId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("チャットエラー:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "申し訳ございません。メッセージの送信に失敗しました。もう一度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingChat(false);
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
    setIsSendingChat(true);

    try {
      // 最初のメッセージの場合、文字起こし内容をコンテキストとして含める
      let messageToSend = inputMessage;
      if (messages.length === 0 && transcription) {
        messageToSend = `以下は音声録音の文字起こし結果です：\n\n「${transcription}」\n\n---\n\nユーザーからの質問: ${inputMessage}`;
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          threadId: threadId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // メッセージを送信後、自動スクロール
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      console.error("チャットエラー:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "申し訳ございません。メッセージの送信に失敗しました。もう一度お試しください。",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSendingChat(false);
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
    <div className="min-h-screen bg-black relative overflow-hidden flex flex-col">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 backdrop-blur-md bg-black/60 border-b border-white/5 flex-shrink-0">
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
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-4 sm:py-6 flex-1 flex flex-col overflow-hidden gap-4">
        {/* 録音ボタンエリア */}
        <div className="flex-shrink-0 flex items-center justify-between backdrop-blur-2xl bg-black/70 border border-white/5 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isRecording && (
                <>
                  <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"></div>
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-pulse"></div>
                </>
              )}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording
                    ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/50"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-110 shadow-lg shadow-blue-500/50"
                } disabled:opacity-50 active:scale-95 group`}
              >
                {isRecording ? (
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:scale-110 transition-transform"
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
            {/* ステータステキスト */}
            <div>
              {isRecording ? (
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <div className="flex gap-1">
                    <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-4 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-3 bg-red-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span>録音中</span>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">
                  {transcription ? "録音完了" : "ボタンを押して録音開始"}
                </p>
              )}
            </div>
          </div>
          {isProcessing && !isRecording && (
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>保存中</span>
            </div>
          )}
        </div>

        {/* AI分析結果エリア */}
        {analysisResult && (
          <div className="flex-shrink-0 backdrop-blur-md bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-4 sm:p-6 border border-purple-500/20 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                <h3 className="text-white font-semibold text-base sm:text-lg">
                  💡 AI分析結果
                </h3>
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-purple-400 text-xs">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>分析中...</span>
                </div>
              )}
            </div>
            <div className="text-gray-200 text-left whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
              {analysisResult.analysis}
            </div>
            <div className="mt-3 pt-3 border-t border-purple-500/20">
              <p className="text-xs text-gray-400">
                📊 文字数: {lastAnalyzedLength}文字で分析
              </p>
            </div>
          </div>
        )}

        {/* 分析中のインジケーター（分析結果がまだない場合） */}
        {isAnalyzing && !analysisResult && transcription.length >= 100 && (
          <div className="flex-shrink-0 backdrop-blur-md bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-xl p-4 sm:p-6 border border-purple-500/20 shadow-xl">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-purple-300 text-sm font-medium">
                AIが内容を分析しています...
              </p>
            </div>
          </div>
        )}

        {/* 文字起こし結果エリア */}
        {(transcription || interimTranscription || isRecording) && (
          <div className="flex-shrink-0 backdrop-blur-md bg-gradient-to-br from-black/60 to-black/40 rounded-xl p-4 sm:p-6 border border-white/10 min-h-[200px] max-h-[300px] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-white font-semibold text-base sm:text-lg">
                  {isRecording ? "リアルタイム文字起こし" : "文字起こし結果"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {transcription.length}文字
                </span>
                {transcription.length >= 100 && transcription.length < lastAnalyzedLength + 100 && (
                  <span className="text-xs text-green-400">
                    ✓ 分析済み
                  </span>
                )}
                {transcription.length >= lastAnalyzedLength + 100 && (
                  <span className="text-xs text-yellow-400 animate-pulse">
                    ⏳ 分析待ち
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-300 text-left whitespace-pre-wrap text-base sm:text-lg leading-relaxed">
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

        {/* チャットエリア */}
        <div className="flex-1 backdrop-blur-2xl bg-black/70 border border-white/5 rounded-xl shadow-2xl flex flex-col overflow-hidden min-h-0">
          {/* チャットヘッダー */}
          <div className="flex-shrink-0 p-4 border-b border-white/5">
            <h2 className="text-lg sm:text-xl font-bold text-white">AIチャット</h2>
          </div>

          {/* メッセージ一覧 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 px-6">
                {transcription ? (
                  <>
                    <div className="text-center">
                      <svg className="w-12 h-12 text-blue-400 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                      <p className="text-white font-semibold text-sm mb-1">
                        文字起こし完了！
                      </p>
                      <p className="text-gray-400 text-sm">
                        文字起こし内容について質問してみましょう
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      <button
                        onClick={() => sendQuickAction("要約して")}
                        disabled={isSendingChat}
                        className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs rounded-lg border border-blue-500/30 transition-all disabled:opacity-50"
                      >
                        📝 要約して
                      </button>
                      <button
                        onClick={() => sendQuickAction("重要なポイントを3つ教えて")}
                        disabled={isSendingChat}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs rounded-lg border border-green-500/30 transition-all disabled:opacity-50"
                      >
                        ⭐ 重要ポイント
                      </button>
                      <button
                        onClick={() => sendQuickAction("詳しく説明して")}
                        disabled={isSendingChat}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded-lg border border-purple-500/30 transition-all disabled:opacity-50"
                      >
                        💡 詳しく
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm text-center">
                    メッセージを入力してAIと会話を始めましょう
                  </p>
                )}
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                        msg.role === "user"
                          ? "bg-blue-500/90 text-white shadow-lg shadow-blue-500/20"
                          : "bg-black/60 text-gray-100 border border-white/5 shadow-lg"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-black/60 border border-white/5 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-gray-300 text-sm">入力中...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* 入力フォーム */}
          <div className="flex-shrink-0 p-4 border-t border-white/5">
            <div className="flex gap-2">
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
                placeholder={
                  transcription && messages.length === 0
                    ? "文字起こし内容について質問する..."
                    : "メッセージを入力..."
                }
                disabled={isSendingChat}
                className="flex-1 bg-black/60 border border-white/5 rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
              <button
                onClick={sendMessage}
                disabled={isSendingChat || !inputMessage.trim()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 active:scale-95 text-sm"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
