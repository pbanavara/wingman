"use client";
import React from "react";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

interface NavBarProps {
  onStartChat?: () => void;
  showStartChat?: boolean;
}

export default function NavBar({ onStartChat, showStartChat }: NavBarProps) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user;

  const handleSignIn = () => {
    void signIn("google");
  };

  const handleSignOut = () => {
    void signOut();
  };

  const handlePrimaryAction = () => {
    if (isAuthenticated) {
      onStartChat?.();
      return;
    }
    handleSignIn();
  };

  const primaryLabel = isAuthenticated ? "Start Chat" : "Sign in with Google";

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-accent border-b border-accent shadow-md">
      <div className="flex items-center gap-2">
        <Image src="/wingman-logo.svg" alt="Wingman" width={28} height={28} className="mr-2" />
        <span className="font-bold text-lg tracking-wide">Wingman AI Co-pilot</span>
      </div>
      <div className="flex gap-4 items-center">
        {showStartChat && (
          <button
            className="bg-success text-foreground px-4 py-2 rounded-lg font-semibold shadow hover:opacity-90 transition"
            onClick={handlePrimaryAction}
          >
            {primaryLabel}
          </button>
        )}
        <a
          href="https://cal.com/pradeep-banavara-nt7ljs/30min"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-accent/60 hover:bg-accent text-foreground px-3 py-2 rounded-lg border border-accent/70 transition"
          aria-label="Book a meeting with Upsellpilot"
        >
          Book a meeting with Upsellpilot
        </a>
        {isAuthenticated && (
          <div className="flex items-center gap-3">
            {user?.image ? (
              <Image
                src={user.image}
                alt={user.name ?? user.email ?? "Signed in user"}
                width={32}
                height={32}
                className="rounded-full border border-accent"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-background border border-accent flex items-center justify-center text-sm font-semibold uppercase">
                {(user?.name ?? user?.email ?? "?").slice(0, 1)}
              </div>
            )}
            <div className="flex flex-col leading-tight text-right">
              <span className="text-sm font-semibold text-foreground/90">{user?.name ?? user?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-foreground/70 hover:text-foreground underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
