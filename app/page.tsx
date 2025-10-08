"use client";

import { SignInButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="h-screen flex items-center justify-center flex-col gap-y-4">
      <h1 className="text-xl font-semibold">ようこそ！</h1>
      <div className="flex gap-4">
        <SignInButton mode="modal">
          <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            ログイン
          </button>
        </SignInButton>
      </div>
    </div>
  );
}
