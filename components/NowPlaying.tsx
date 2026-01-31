"use client";

import { motion, AnimatePresence } from "framer-motion";

type NowPlayingProps = {
  show: boolean;
  teamName?: string;
};

export function NowPlaying({ show, teamName }: NowPlayingProps) {
  return (
    <AnimatePresence>
      {show && teamName ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80"
        >
          <motion.div
            initial={{ y: 30 }}
            animate={{ y: 0 }}
            exit={{ y: 30 }}
            className="rounded-3xl border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-fuchsia-500/20 px-10 py-8 text-center shadow-[0_0_50px_rgba(0,229,255,0.4)]"
          >
            <div className="text-xs uppercase tracking-[0.4em] text-cyan-200">
              Buzzed First
            </div>
            <div className="mt-3 text-5xl font-extrabold text-white">
              {teamName}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
