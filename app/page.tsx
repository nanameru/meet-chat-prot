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
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Meet Chat</h1>
          <div>
            <SignedOut>
              <Link href="/sign-in">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
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
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <h2 className="text-5xl font-bold">Meet Chatへようこそ</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            リアルタイムでチャットができる、シンプルで使いやすいチャットアプリケーションです。
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <SignedOut>
              <Link href="/sign-in">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                  今すぐ始める
                </button>
              </Link>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">
                <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                  ダッシュボードへ
                </button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Meet Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
