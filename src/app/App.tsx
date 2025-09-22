"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useSession } from "next-auth/react";

import NavBar from "./components/NavBar";

// UI components
import Transcript from "./components/Transcript";
// Removed right-side Events panel to simplify UI
import BottomToolbar from "./components/BottomToolbar";

// Types
import { SessionStatus, TranscriptItem } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";

// Agent configs
import { allAgentSets, defaultAgentSetKey } from "@/app/agentConfigs";
import { customerServiceRetailScenario } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorScenario } from "@/app/agentConfigs/chatSupervisor";
import { customerServiceRetailCompanyName } from "@/app/agentConfigs/customerServiceRetail";
import { chatSupervisorCompanyName } from "@/app/agentConfigs/chatSupervisor";
import { simpleHandoffScenario } from "@/app/agentConfigs/simpleHandoff";

// Map used by connect logic for scenarios defined via the SDK.
const sdkScenarioMap: Record<string, RealtimeAgent[]> = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario,
};

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";

type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  transcriptItems: TranscriptItem[];
};

const SESSIONS_STORAGE_PREFIX = "wingman.chat.sessions";
const FALLBACK_SESSION_TITLE = "New Session";
const MAX_SESSION_TITLE_LENGTH = 32;

const cloneTranscriptItems = (items: TranscriptItem[]): TranscriptItem[] => {
  try {
    return structuredClone(items);
  } catch {
    return JSON.parse(JSON.stringify(items));
  }
};

const deriveSessionTitle = (items: TranscriptItem[]): string => {
  const firstUserMessage = items.find(
    (item) =>
      item.type === "MESSAGE" &&
      item.role === "user" &&
      !item.isHidden &&
      typeof item.title === "string" &&
      item.title.trim().length > 0,
  );

  if (!firstUserMessage || !firstUserMessage.title) {
    return FALLBACK_SESSION_TITLE;
  }

  const normalized = firstUserMessage.title.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return FALLBACK_SESSION_TITLE;
  }

  if (normalized.length <= MAX_SESSION_TITLE_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_SESSION_TITLE_LENGTH).trimEnd()}...`;
};

function App() {
  const searchParams = useSearchParams()!;
  const { data: authSession } = useSession();

  const sessionOwnerId = authSession?.user?.id ?? "default";
  const storageKey = React.useMemo(
    () => `${SESSIONS_STORAGE_PREFIX}.${sessionOwnerId}`,
    [sessionOwnerId],
  );

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    transcriptItems,
    addTranscriptMessage,
    addTranscriptBreadcrumb,
    replaceTranscriptItems,
    clearTranscript,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const replaceTranscriptItemsRef = useRef(replaceTranscriptItems);
  const clearTranscriptRef = useRef(clearTranscript);

  useEffect(() => {
    replaceTranscriptItemsRef.current = replaceTranscriptItems;
  }, [replaceTranscriptItems]);

  useEffect(() => {
    clearTranscriptRef.current = clearTranscript;
  }, [clearTranscript]);

  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<
    RealtimeAgent[] | null
  >(null);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsHydrated, setSessionsHydrated] = useState(false);

  const createEmptySession = React.useCallback((): ChatSession => ({
    id: uuidv4(),
    title: FALLBACK_SESSION_TITLE,
    createdAt: Date.now(),
    transcriptItems: [],
  }), []);

  // Removed Events pane state as the panel is no longer shown
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(true);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setSessionsHydrated(false);

    try {
      const storedValue = localStorage.getItem(storageKey);
      let parsedSessions: ChatSession[] = [];

      if (storedValue) {
        try {
          const parsed = JSON.parse(storedValue) as ChatSession[];
          if (Array.isArray(parsed)) {
            parsedSessions = parsed.map((session) => ({
              id: session.id,
              title: session.title ?? FALLBACK_SESSION_TITLE,
              createdAt: session.createdAt ?? Date.now(),
              transcriptItems: Array.isArray(session.transcriptItems)
                ? session.transcriptItems
                : [],
            }));
          }
        } catch (error) {
          console.warn('[wingman] Failed to parse stored sessions', error);
        }
      }

      if (parsedSessions.length === 0) {
        const freshSession = createEmptySession();
        parsedSessions = [freshSession];
        clearTranscriptRef.current();
      } else {
        replaceTranscriptItemsRef.current(
          cloneTranscriptItems(parsedSessions[0].transcriptItems ?? []),
        );
      }

      setSessions(parsedSessions);
      setActiveSessionId(parsedSessions[0]?.id ?? null);
      setUserText("");
    } catch (error) {
      console.warn('[wingman] Unable to restore sessions', error);
      const fallbackSession = createEmptySession();
      setSessions([fallbackSession]);
      setActiveSessionId(fallbackSession.id);
      clearTranscriptRef.current();
      setUserText("");
    } finally {
      setSessionsHydrated(true);
    }
  }, [storageKey, createEmptySession]);

  useEffect(() => {
    if (!sessionsHydrated) return;
    if (!activeSessionId) return;

    setSessions((prev) => {
      const index = prev.findIndex((session) => session.id === activeSessionId);
      if (index === -1) return prev;

      const updatedSessions = [...prev];
      const currentSession = updatedSessions[index];
      const derivedTitle = deriveSessionTitle(transcriptItems);
      const shouldUpdateTitle =
        derivedTitle !== FALLBACK_SESSION_TITLE ||
        currentSession.title === FALLBACK_SESSION_TITLE;

      updatedSessions[index] = {
        ...currentSession,
        transcriptItems: cloneTranscriptItems(transcriptItems),
        title: shouldUpdateTitle ? derivedTitle : currentSession.title,
      };

      return updatedSessions;
    });
  }, [activeSessionId, transcriptItems, sessionsHydrated]);

  useEffect(() => {
    if (!sessionsHydrated) return;
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (error) {
      console.warn('[wingman] Failed to persist sessions', error);
    }
  }, [sessions, sessionsHydrated, storageKey]);

  useHandleSessionHistory();

  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  useEffect(() => {
    if (selectedAgentName && sessionStatus === "DISCONNECTED") {
      connectToRealtime();
    }
  }, [selectedAgentName]);

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentConfigSet &&
      selectedAgentName
    ) {
      const currentAgent = selectedAgentConfigSet.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(`Agent: ${selectedAgentName}`, currentAgent);
      updateSession(!handoffTriggeredRef.current);
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [selectedAgentConfigSet, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session");
    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = searchParams.get("agentConfig") || "default";
    if (sdkScenarioMap[agentSetKey]) {
      if (sessionStatus !== "DISCONNECTED") return;
      setSessionStatus("CONNECTING");

      try {
        const EPHEMERAL_KEY = await fetchEphemeralKey();
        if (!EPHEMERAL_KEY) return;

        // Ensure the selectedAgentName is first so that it becomes the root
        const reorderedAgents = [...sdkScenarioMap[agentSetKey]];
        const idx = reorderedAgents.findIndex((a) => a.name === selectedAgentName);
        if (idx > 0) {
          const [agent] = reorderedAgents.splice(idx, 1);
          reorderedAgents.unshift(agent);
        }

        const companyName = agentSetKey === 'customerServiceRetail'
          ? customerServiceRetailCompanyName
          : chatSupervisorCompanyName;
        const guardrail = createModerationGuardrail(companyName);

        await connect({
          getEphemeralKey: async () => EPHEMERAL_KEY,
          initialAgents: reorderedAgents,
          audioElement: sdkAudioElement,
          outputGuardrails: [guardrail],
          extraContext: {
            addTranscriptBreadcrumb,
          },
        });
      } catch (err) {
        console.error("Error connecting via SDK:", err);
        setSessionStatus("DISCONNECTED");
      }
      return;
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;

    const targetSession = sessions.find((session) => session.id === sessionId);
    if (!targetSession) return;

    disconnectFromRealtime();
    setActiveSessionId(sessionId);
    replaceTranscriptItemsRef.current(
      cloneTranscriptItems(targetSession.transcriptItems),
    );
    setUserText("");
  };

  const handleCreateSession = () => {
    disconnectFromRealtime();

    const newSession = createEmptySession();
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    clearTranscriptRef.current();
    setUserText("");
  };

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial 'hi' message to trigger the agent to greet the user
    if (shouldTriggerResponse) {
      sendSimulatedUserMessage('hi');
    }
    return;
  }

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      connectToRealtime();
    }
  };

  // Scenario/Agent selection handlers removed as the selector is hidden

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  // Logs panel removed; no longer persisting logsExpanded

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  // const agentSetKey = searchParams.get("agentConfig") || "default";

  return (
    <div className="text-base flex flex-col h-screen bg-background text-foreground relative">
      <NavBar
        onStartChat={connectToRealtime}
        showStartChat={sessionStatus === "DISCONNECTED"}
      />

      <div className="flex flex-1 overflow-hidden bg-background">
        <aside className="w-72 max-w-xs bg-accent border-r border-accent flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-accent/60">
            <span className="font-semibold text-base">Sessions</span>
            <button
              type="button"
              onClick={handleCreateSession}
              disabled={!sessionsHydrated}
              className={`text-sm font-semibold px-3 py-1 rounded-md bg-background text-foreground border border-accent transition ${
                sessionsHydrated ? 'hover:bg-background/80' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-accent/60">
            {sessions.length === 0 ? (
              <div className="px-4 py-6 text-sm text-foreground/70">
                No sessions yet.
              </div>
            ) : (
              sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const preview = session.title || FALLBACK_SESSION_TITLE;
                const createdLabel = new Date(session.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });
                const messageCount = session.transcriptItems.filter(
                  (item) => item.type === 'MESSAGE' && !item.isHidden,
                ).length;

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isActive
                        ? 'bg-background text-foreground shadow-inner'
                        : 'hover:bg-background/50 text-foreground/80'
                    }`}
                  >
                    <div className="text-sm font-semibold truncate">{preview}</div>
                    <div className="flex justify-between text-xs text-foreground/60 mt-1">
                      <span>{createdLabel}</span>
                      <span>{messageCount} msgs</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 flex justify-center">
            <div className="w-full max-w-3xl">
              <Transcript
                userText={userText}
                setUserText={setUserText}
                onSendMessage={handleSendTextMessage}
                downloadRecording={downloadRecording}
                canSend={sessionStatus === "CONNECTED"}
              />
            </div>
          </div>

          <BottomToolbar
            sessionStatus={sessionStatus}
            onToggleConnection={onToggleConnection}
            isPTTActive={isPTTActive}
            setIsPTTActive={setIsPTTActive}
            isPTTUserSpeaking={isPTTUserSpeaking}
            handleTalkButtonDown={handleTalkButtonDown}
            handleTalkButtonUp={handleTalkButtonUp}
            isAudioPlaybackEnabled={isAudioPlaybackEnabled}
            setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
            codec={urlCodec}
            onCodecChange={handleCodecChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
