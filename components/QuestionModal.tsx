"use client";

import React from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import type { Question, Team } from "@/lib/types";

type QuestionModalProps = {
  question: Question;
  teams: Team[];
  winnerTeamId?: string;
  onClose: () => void;
  onMarkUsed: (used: boolean) => void;
  onScore: (result: "correct" | "wrong") => void;
};

export function QuestionModal({
  question,
  teams,
  winnerTeamId,
  onClose,
  onMarkUsed,
  onScore,
}: QuestionModalProps) {
  const [showAnswer, setShowAnswer] = React.useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-6">
      <motion.div
        initial={{ rotateX: -15, opacity: 0, y: 30 }}
        animate={{ rotateX: 0, opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-5xl rounded-3xl border border-cyan-400/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 shadow-[0_0_60px_rgba(0,229,255,0.25)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">
              Question Value
            </div>
            <div className="text-4xl font-bold text-yellow-200">
              ${question.value}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-2xl font-semibold text-white">
              {question.questionText}
            </div>
            {question.media?.url ? (
              <div className="overflow-hidden rounded-2xl border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.media.url}
                  alt={question.media.alt ?? "Question media"}
                  className="h-64 w-full object-cover"
                />
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                  Answer
                </div>
                <button
                  type="button"
                  onClick={() => setShowAnswer((prev) => !prev)}
                  className="rounded-full border border-cyan-300/40 px-4 py-2 text-xs uppercase tracking-widest text-cyan-100 hover:border-cyan-200"
                >
                  {showAnswer ? "Hide" : "Reveal"}
                </button>
              </div>
              <div
                className={clsx(
                  "mt-3 text-lg font-semibold text-white/90 transition",
                  !showAnswer && "blur-sm opacity-60"
                )}
              >
                {question.answerText ?? "No answer provided yet."}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {winnerTeamId ? (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
                <div className="text-xs uppercase tracking-[0.25em] text-cyan-200">
                  First Buzzer
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{
                      backgroundColor:
                        teams.find((t) => t.id === winnerTeamId)?.color ??
                        "#00E5FF",
                    }}
                  />
                  <span className="text-xl font-bold text-cyan-100">
                    {teams.find((t) => t.id === winnerTeamId)?.name ?? "Unknown"}
                  </span>
                </div>
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                Score First Buzzer
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!winnerTeamId}
                  onClick={() => winnerTeamId && onScore("correct")}
                  className="rounded-full bg-green-500/20 px-4 py-2 text-xs uppercase tracking-widest text-green-200 hover:bg-green-400/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Correct (+{question.value})
                </button>
                <button
                  type="button"
                  disabled={!winnerTeamId}
                  onClick={() => winnerTeamId && onScore("wrong")}
                  className="rounded-full bg-red-500/20 px-4 py-2 text-xs uppercase tracking-widest text-red-200 hover:bg-red-400/30 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Wrong (-{question.value})
                </button>
              </div>
              <button
                type="button"
                onClick={() => onMarkUsed(!question.used)}
                className="mt-4 w-full rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
              >
                {question.used ? "Mark unused" : "Mark used & close"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
