'use client';
import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
      <div className="bg-accent rounded-xl shadow-lg p-8 flex flex-col items-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-4" xmlns="http://www.w3.org/2000/svg">
          <rect x="3" y="3" width="18" height="18" rx="4" fill="#4caf50" />
          <rect x="7" y="11" width="10" height="2" rx="1" fill="#e0f2f1" />
          <rect x="11" y="7" width="2" height="10" rx="1" fill="#e0f2f1" />
        </svg>
        <h1 className="text-3xl font-bold mb-2 text-center">Wingman</h1>
        <p className="mb-6 text-lg text-center text-foreground/80">Your AI sales copilot</p>
        <button
          className="bg-success text-background px-6 py-3 rounded-lg font-semibold shadow hover:bg-green-700 transition"
          onClick={() => router.push("/chat")}
        >
          Start Chat
        </button>
      </div>
    </div>
  );
}
