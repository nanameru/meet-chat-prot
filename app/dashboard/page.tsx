"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ヘッダー */}
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/dashboard">
            <h1 className="text-2xl font-bold cursor-pointer">Meet Chat</h1>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-700">
              {user?.firstName || user?.username || "ユーザー"}さん
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">ダッシュボード</h2>
            <p className="text-gray-600">
              ようこそ、{user?.firstName || user?.username}さん！
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* チャットカード */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  💬
                </div>
                <h3 className="ml-4 text-xl font-semibold">チャット</h3>
              </div>
              <p className="text-gray-600 mb-4">
                リアルタイムでメッセージをやり取りできます
              </p>
              <button className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                チャットを開始
              </button>
            </div>

            {/* プロフィールカード */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  👤
                </div>
                <h3 className="ml-4 text-xl font-semibold">プロフィール</h3>
              </div>
              <p className="text-gray-600 mb-4">
                あなたのプロフィールを編集できます
              </p>
              <button className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                プロフィール設定
              </button>
            </div>

            {/* 設定カード */}
            <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  ⚙️
                </div>
                <h3 className="ml-4 text-xl font-semibold">設定</h3>
              </div>
              <p className="text-gray-600 mb-4">
                アプリケーションの設定を変更できます
              </p>
              <button className="w-full bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded">
                設定を開く
              </button>
            </div>
          </div>

          {/* 統計情報 */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">アカウント情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-blue-500">0</div>
                <div className="text-gray-600">メッセージ数</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-green-500">0</div>
                <div className="text-gray-600">友達</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-purple-500">0</div>
                <div className="text-gray-600">チャンネル</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* フッター */}
      <footer className="border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2025 Meet Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

