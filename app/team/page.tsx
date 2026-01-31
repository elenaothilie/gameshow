"use client";

import React from "react";
import { motion } from "framer-motion";
import { getSocket } from "@/lib/socket";
import { playBuzzerSound } from "@/lib/sounds";
import type { PublicSessionState } from "@/lib/types";

const STORAGE_KEY = "jeopardy:team";
const SOUND_KEY = "jeopardy:team-sound";

export default function TeamPage() {
  const socketRef = React.useRef<Awaited<ReturnType<typeof getSocket>> | null>(
    null
  );
  const [session, setSession] = React.useState<PublicSessionState | null>(null);
  const [sessionCode, setSessionCode] = React.useState("");
  const [teamName, setTeamName] = React.useState("");
  const [teamId, setTeamId] = React.useState<string | null>(null);
  const [buzzStatus, setBuzzStatus] = React.useState<"first" | "late" | null>(
    null
  );
  const [soundOn, setSoundOn] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedSound = localStorage.getItem(SOUND_KEY);
    if (storedSound) setSoundOn(storedSound === "on");
    if (stored) {
      const parsed = JSON.parse(stored) as {
        code: string;
        name: string;
        teamId: string;
      };
      setSessionCode(parsed.code);
      setTeamName(parsed.name);
      setTeamId(parsed.teamId);
    }
  }, []);

  React.useEffect(() => {
    let active = true;
    getSocket().then((socket) => {
      if (!active) return;
      socketRef.current = socket;
      socket.on("state:sync", (state: PublicSessionState) => {
        setSession(state);
      });

      if (sessionCode && teamName) {
        socket.emit(
          "team:join",
          { code: sessionCode, teamName, teamId },
          (response: { error?: string; state?: PublicSessionState; teamId?: string }) => {
            if (response?.state && response?.teamId) {
              setSession(response.state);
              setTeamId(response.teamId);
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                  code: sessionCode,
                  name: teamName,
                  teamId: response.teamId,
                })
              );
            }
          }
        );
      }
    });

    return () => {
      active = false;
      socketRef.current?.off("state:sync");
    };
  }, [sessionCode, teamName, teamId]);

  React.useEffect(() => {
    if (!session?.buzzingOpen) {
      setBuzzStatus(null);
    }
  }, [session?.buzzingOpen, session?.activeQuestionId]);

  const joinSession = () => {
    if (!sessionCode || !teamName) return;
    socketRef.current?.emit(
      "team:join",
      { code: sessionCode, teamName, teamId },
      (response: { error?: string; state?: PublicSessionState; teamId?: string }) => {
        if (response?.state && response?.teamId) {
          setSession(response.state);
          setTeamId(response.teamId);
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              code: sessionCode,
              name: teamName,
              teamId: response.teamId,
            })
          );
        }
      }
    );
  };

  const buzz = () => {
    if (!sessionCode || !teamId) return;
    socketRef.current?.emit(
      "team:buzz",
      { code: sessionCode, teamId },
      (response: { status: string; winnerTeamId?: string }) => {
        if (response.status === "accepted") {
          const isWinner = response.winnerTeamId === teamId;
          setBuzzStatus(isWinner ? "first" : "late");
          if (isWinner && soundOn) {
            playBuzzerSound();
            navigator.vibrate?.(150);
          }
        } else if (response.status === "locked") {
          setBuzzStatus("late");
        }
      }
    );
  };

  const hasBuzzed = session?.buzzes.some((buzz) => buzz.teamId === teamId) ?? false;
  const isWinner = session?.winnerTeamId === teamId;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-md space-y-6">
          <h1 className="text-3xl font-extrabold text-cyan-100">
            Join Jeopardy Round 1
          </h1>
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-[0.35em] text-cyan-200">
              Join Code
            </label>
            <input
              value={sessionCode}
              onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-lg tracking-widest text-white"
            />
          </div>
          <div className="space-y-3">
            <label className="block text-xs uppercase tracking-[0.35em] text-cyan-200">
              Team Name
            </label>
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-lg text-white"
            />
          </div>
          <button
            type="button"
            onClick={joinSession}
            className="w-full rounded-full bg-cyan-500/30 py-3 text-sm uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/40"
          >
            Join Game
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              localStorage.setItem(SOUND_KEY, next ? "on" : "off");
            }}
            className="w-full rounded-full border border-white/10 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Sound {soundOn ? "On" : "Off"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6 text-center">
        <div>
          <div className="text-xs uppercase tracking-[0.4em] text-cyan-200">
            Team
          </div>
          <div className="text-3xl font-extrabold text-white">{teamName}</div>
          <div className="mt-2 text-sm text-white/60">
            Session code: <span className="text-yellow-200">{session.code}</span>
          </div>
        </div>

        {!session.buzzingOpen ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <div className="text-sm uppercase tracking-[0.35em] text-cyan-200">
              Waiting
            </div>
            <div className="mt-3 text-lg text-white/80">
              Connected. Wait for the Host to open buzzing.
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-cyan-400/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">
              Buzzing Open
            </div>
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={buzz}
              disabled={hasBuzzed}
              className="mt-6 w-full rounded-full bg-cyan-500/40 py-8 text-3xl font-extrabold tracking-[0.3em] text-white shadow-[0_0_30px_rgba(0,229,255,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              BUZZ
            </motion.button>
            {hasBuzzed ? (
              <div className="mt-4 text-sm text-white/70">
                Buzz received. Waiting for result...
              </div>
            ) : null}
          </div>
        )}

        {isWinner ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-3xl border border-cyan-400/40 bg-cyan-500/10 p-6 text-2xl font-extrabold text-cyan-100"
          >
            YOU&apos;RE FIRST!
          </motion.div>
        ) : null}

        {!isWinner && buzzStatus === "late" ? (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 text-lg text-white/70">
            Too late. Another team buzzed first.
          </div>
        ) : null}
      </div>
    </div>
  );
}
