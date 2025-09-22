"use client";

import { signIn } from "next-auth/react";

import NavBar from "@/app/components/NavBar";

export default function SignInGate() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <NavBar />
      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Sign in to start chatting</h1>
          <p className="text-foreground/80 max-w-md">
            Connect with Google to sync your Wingman sessions and pick up conversations across devices.
          </p>
        </div>
        <button
          onClick={() => signIn("google")}
          className="bg-success text-foreground px-6 py-3 rounded-lg font-semibold shadow hover:opacity-90 transition"
        >
          Sign in with Google
        </button>
      </main>
    </div>
  );
}
