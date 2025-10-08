"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden px-4">
      {/* 背景エフェクト */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Meet Chatにログイン</h1>
          <p className="text-gray-400 text-sm sm:text-base">アカウントにサインインしてください</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "backdrop-blur-2xl bg-black/70 border border-white/5 shadow-2xl",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              socialButtonsBlockButton: "backdrop-blur-sm bg-white/10 border border-white/10 hover:bg-white/20 text-white",
              formButtonPrimary: "bg-blue-500/90 hover:bg-blue-600/90 backdrop-blur-sm shadow-lg shadow-blue-500/30",
              footerActionLink: "text-blue-400 hover:text-blue-300",
              identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
              formFieldLabel: "text-gray-300",
              formFieldInput: "bg-black/60 border-white/5 text-white placeholder-gray-500 focus:border-blue-500/50",
              dividerLine: "bg-white/10",
              dividerText: "text-gray-400",
            },
          }}
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/dashboard"
        />
      </div>
    </div>
  );
}

