"use client";

import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  // ログイン済みユーザーはダッシュボードにリダイレクト
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      {/* ヘッダー */}
      <header className="relative z-10 backdrop-blur-md bg-black/60 border-b border-white/5">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Meet Chat</h1>
          <div>
            <SignedOut>
              <Link href="/sign-in">
                <button className="bg-blue-500/90 hover:bg-blue-600/90 text-white font-bold py-2 px-4 sm:px-6 rounded-xl backdrop-blur-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm sm:text-base">
                  ログイン
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6 sm:space-y-8 max-w-4xl">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white">
            Meet Chatへようこそ
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto px-4">
            音声録音とAIチャットで、会議をもっとスマートに。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 sm:pt-6">
            <SignedOut>
              <Link href="/sign-in">
                <button className="w-full sm:w-auto bg-blue-500/90 hover:bg-blue-600/90 text-white font-bold py-3 sm:py-4 px-8 sm:px-12 rounded-xl text-base sm:text-lg backdrop-blur-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                  今すぐ始める
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="w-full sm:w-auto bg-blue-500/90 hover:bg-blue-600/90 text-white font-bold py-3 sm:py-4 px-8 sm:px-12 rounded-xl text-base sm:text-lg backdrop-blur-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                  ダッシュボードへ
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="relative z-10 backdrop-blur-md bg-black/60 border-t border-white/5 py-4 sm:py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm sm:text-base">
          <p>&copy; 2025 Meet Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
