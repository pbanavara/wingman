import React, { Suspense } from "react";
import { getServerSession } from "next-auth";

import { TranscriptProvider } from "@/app/contexts/TranscriptContext";
import { EventProvider } from "@/app/contexts/EventContext";
import { authOptions } from "@/app/lib/authOptions";
import App from "../App";
import SignInGate from "./SignInGate";

export default async function ChatPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <SignInGate />;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TranscriptProvider>
        <EventProvider>
          <App />
        </EventProvider>
      </TranscriptProvider>
    </Suspense>
  );
}
