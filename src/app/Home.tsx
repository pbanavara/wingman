'use client';
import React from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const handleStartChat = () => {
    try {
      track("start_chat_click", { source: "home" });
    } catch {}
    router.push("/chat");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Hero */}
      <header className="flex-0 px-6 py-16 md:py-20 bg-accent border-b border-accent">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/wingman-logo.svg"
              alt="Wingman logo"
              width={96}
              height={96}
              priority
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
            Upsellpilot Wingman
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80">From drowning in admin work to closing more deals, built for sales teams on the road</p>

          <div className="mt-8">
            <button
              className="inline-flex items-center gap-2 bg-success text-foreground px-6 py-3 rounded-lg font-semibold shadow hover:opacity-90 transition"
              onClick={handleStartChat}
              aria-label="Start Chat with Wingman"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                fill="currentColor"
              >
                <path d="M12 14a4 4 0 0 0 4-4V6a4 4 0 0 0-8 0v4a4 4 0 0 0 4 4zm-1 2.93V20H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-3.07A7.002 7.002 0 0 0 19 10a1 1 0 1 0-2 0 5 5 0 1 1-10 0 1 1 0 1 0-2 0 7.002 7.002 0 0 0 8 6.93z" />
              </svg>
              <span>Start Chat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Features */}
      <main className="flex-1 px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto space-y-10 md:space-y-16">
          {/* Post‑Meeting Capture */}
          <section className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-accent rounded-xl p-6 md:p-10">
            {/* Vertical divider between text and image */}
            <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-[2px] bg-white/50 z-10" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Post‑Meeting Capture</h2>
              <p className="text-foreground/80 mb-3">
                Turn post‑meeting thoughts into clean, searchable notes in seconds. Dictate your recap and Wingman extracts key highlights, objections, next steps, and owners.
              </p>
              <ul className="list-disc list-inside text-foreground/80 space-y-1">
                <li>Voice‑to‑CRM meeting recap with action items</li>
                <li>Auto‑generate follow‑up emails and call summaries</li>
                <li>Structured fields: contact, company, opportunity, timeline</li>
              </ul>
            </div>
            <div className="flex justify-center md:justify-end">
              <Image src="/feature-post-meeting.svg" alt="Turn your post‑meeting notes into structured summaries" width={440} height={280} />
            </div>
          </section>

          {/* Real‑Time Intel (alternate layout on desktop) */}
          <section className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-accent rounded-xl p-6 md:p-10">
            {/* Vertical divider between text and image */}
            <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-[2px] bg-white/50 z-10" />
            <div className="md:order-2">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Real‑Time Intel</h2>
              <p className="text-foreground/80 mb-3">
                Need answers right before a call? Ask natural‑language questions and instantly surface relevant details from notes and CRM—customer context, decision makers, open opportunities, and risks.
              </p>
              <ul className="list-disc list-inside text-foreground/80 space-y-1">
                <li>Natural‑language search across notes and CRM fields</li>
                <li>Last‑minute prep: who to speak with, what they care about</li>
                <li>On‑the‑go access tailored for field sales and AEs</li>
              </ul>
            </div>
            <div className="flex justify-center md:justify-start md:order-1">
              <Image src="/feature-real-time.svg" alt="Real‑time customer insights and fast prep" width={440} height={280} />
            </div>
          </section>

          {/* CRM Automation */}
          <section className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-accent rounded-xl p-6 md:p-10">
            {/* Vertical divider between text and image */}
            <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-[2px] bg-white/50 z-10" />
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">CRM Automation</h2>
              <p className="text-foreground/80 mb-3">
                Wingman translates every conversation into structured CRM updates—so Salesforce, HubSpot, or even Google Sheets stay current without manual data entry.
              </p>
              <ul className="list-disc list-inside text-foreground/80 space-y-1">
                <li>Create activities, update opportunities, and log tasks automatically</li>
                <li>Map to your existing data model or use Wingman’s built‑in CRM</li>
                <li>Human‑in‑the‑loop review to keep data clean and compliant</li>
              </ul>
            </div>
            <div className="flex justify-center md:justify-end">
              <Image src="/feature-crm-automation.svg" alt="Automate Salesforce, HubSpot, or Sheets updates" width={440} height={280} />
            </div>
          </section>

          {/* CRM Note + Bottom CTA */}
          <div className="text-center space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold">Ready to supercharge your field sales ?</h3>
            <button
              className="inline-flex items-center gap-2 bg-success text-foreground px-6 py-3 rounded-lg font-semibold shadow hover:opacity-90 transition"
              onClick={handleStartChat}
              aria-label="Start Chat with Wingman"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                fill="currentColor"
              >
                <path d="M4 12.75a.75.75 0 0 1 1.5 0 6.5 6.5 0 0 0 13 0 .75.75 0 0 1 1.5 0 8 8 0 0 1-16 0zM8 11a.75.75 0 0 1-1.5 0V7a5.5 5.5 0 1 1 11 0v4a.75.75 0 0 1-1.5 0V7a4 4 0 1 0-8 0v4z" />
              </svg>
              <span>Get started</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
