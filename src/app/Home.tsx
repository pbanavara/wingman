'use client';
import React from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <header className="flex-0 px-6 py-16 md:py-20 bg-accent border-b border-accent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-5">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="4" fill="#4caf50" />
              <rect x="7" y="11" width="10" height="2" rx="1" fill="#e0f2f1" />
              <rect x="11" y="7" width="2" height="10" rx="1" fill="#e0f2f1" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            UpsellPilot
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80">Your wingman for field sales.</p>

          <div className="mt-8">
            <button
              className="bg-success text-background px-6 py-3 rounded-lg font-semibold shadow hover:bg-green-700 transition"
              onClick={() => {
                try { track("start_chat_click", { source: "home" }); } catch {}
                router.push("/chat");
              }}
            >
              Start Chat
            </button>
          </div>
        </div>
      </header>

      {/* Scenarios */}
      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario 1 */}
            <div className="bg-accent rounded-xl p-6 shadow border border-accent/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-md bg-green-600 flex items-center justify-center text-background font-bold">1</div>
                <h3 className="text-lg font-semibold">Post‑Meeting Capture</h3>
              </div>
              <p className="text-foreground/80">
                Chat with Wingman soon after your customer meetings to capture key insights.
              </p>
            </div>

            {/* Scenario 2 */}
            <div className="bg-accent rounded-xl p-6 shadow border border-accent/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-md bg-green-600 flex items-center justify-center text-background font-bold">2</div>
                <h3 className="text-lg font-semibold">Real‑Time Intel</h3>
              </div>
              <p className="text-foreground/80">
                Obtain key insights about a customer in real time even at the last minute.
              </p>
            </div>

            {/* Scenario 3 */}
            <div className="bg-accent rounded-xl p-6 shadow border border-accent/60">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-md bg-green-600 flex items-center justify-center text-background font-bold">3</div>
                <h3 className="text-lg font-semibold">CRM Automation</h3>
              </div>
              <p className="text-foreground/80">
                Transform all captured data into structured CRM data models and update Salesforce, HubSpot, or even Google Sheets.
              </p>
            </div>
          </div>

          {/* CRM Note */}
          <div className="mt-10 md:mt-12 text-center">
            <p className="text-base md:text-lg text-foreground/80">
              Wingman works with a CRM if you have one, or maintains its own CRM if you don’t.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
