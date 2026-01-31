"use client";

import { motion } from "framer-motion";
import type { Category, Question } from "@/lib/types";
import clsx from "clsx";

type BoardProps = {
  board: Category[];
  activeQuestionId?: string;
  onSelectQuestion: (question: Question) => void;
};

export function Board({ board, activeQuestionId, onSelectQuestion }: BoardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid grid-cols-6 gap-4"
    >
      {board.map((category) => (
        <div key={category.id} className="space-y-4">
          <div className="rounded-xl bg-slate-900/60 px-3 py-4 text-center text-sm font-semibold uppercase tracking-widest text-cyan-200 shadow-[0_0_20px_rgba(0,229,255,0.2)]">
            {category.name}
          </div>
          <div className="grid gap-3">
            {category.questions.map((question) => {
              const isActive = activeQuestionId === question.id;
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => onSelectQuestion(question)}
                  className={clsx(
                    "relative overflow-hidden rounded-xl border border-cyan-400/20 bg-slate-950/70 px-2 py-6 text-center text-2xl font-bold text-yellow-200 transition",
                    "hover:border-cyan-300 hover:text-yellow-100 hover:shadow-[0_0_25px_rgba(0,229,255,0.35)]",
                    question.used && "opacity-40 grayscale",
                    isActive && "border-yellow-300 text-yellow-100 shadow-[0_0_30px_rgba(255,209,102,0.45)]"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-fuchsia-500/10" />
                  <span className="relative">${question.value}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </motion.div>
  );
}
