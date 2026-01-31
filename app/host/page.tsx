"use client";

import React from "react";
import { useReducedMotion } from "framer-motion";
import { Board } from "@/components/Board";
import { NowPlaying } from "@/components/NowPlaying";
import { QuestionModal } from "@/components/QuestionModal";
import { TeamList } from "@/components/TeamList";
import * as api from "@/lib/api";
import { playBuzzerSound, playCorrectSound, playWrongSound } from "@/lib/sounds";
import type { PublicSessionState, Question, SeedBoard } from "@/lib/types";

const STORAGE_KEY = "jeopardy:host";
const SOUND_KEY = "jeopardy:sound";

function boardToSeed(board: PublicSessionState["board"]): SeedBoard {
  return {
    categories: board.map((category) => ({
      name: category.name,
      questions: category.questions.map((question) => ({
        value: question.value,
        questionText: question.questionText,
        answerText: question.answerText,
        mediaUrl: question.media?.url,
        mediaAlt: question.media?.alt,
      })),
    })),
  };
}

export default function HostPage() {
  const reduceMotion = useReducedMotion();
  const [session, setSession] = React.useState<PublicSessionState | null>(null);
  const [sessionCode, setSessionCode] = React.useState<string>("");
  const [hostPin, setHostPin] = React.useState<string>("");
  const [selectedQuestion, setSelectedQuestion] = React.useState<Question | null>(
    null
  );
  const [showNowPlaying, setShowNowPlaying] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [editorBoard, setEditorBoard] = React.useState<SeedBoard | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    const storedSound = localStorage.getItem(SOUND_KEY);
    if (storedSound) {
      setSoundOn(storedSound === "on");
    }
    if (stored) {
      const parsed = JSON.parse(stored) as { code: string; pin: string };
      setSessionCode(parsed.code);
      setHostPin(parsed.pin);
    }
  }, []);

  // Poll for session updates when we have an active session
  React.useEffect(() => {
    if (!sessionCode || !session) return;
    return api.pollSession(sessionCode, setSession);
  }, [sessionCode, !!session]);

  // Rejoin: try hostJoin when we have stored code/pin but no session
  React.useEffect(() => {
    if (!sessionCode || !hostPin || session) return;
    let active = true;
    api.hostJoin(sessionCode, hostPin)
      .then(({ state }) => {
        if (active) setSession(state);
      })
      .catch(() => {
        // Session may not exist yet, that's ok
      });
    return () => {
      active = false;
    };
  }, [sessionCode, hostPin]);

  React.useEffect(() => {
    if (!session) return;
    if (!editing) {
      setEditorBoard(boardToSeed(session.board));
    }
  }, [session, editing]);

  React.useEffect(() => {
    if (!session || !selectedQuestion) return;
    for (const category of session.board) {
      const match = category.questions.find(
        (question) => question.id === selectedQuestion.id
      );
      if (match) {
        setSelectedQuestion(match);
        break;
      }
    }
  }, [session, selectedQuestion]);

  // Auto-open buzzing when a question is opened (and not already used)
  React.useEffect(() => {
    if (!selectedQuestion || !sessionCode || !hostPin) return;
    if (!selectedQuestion.used) {
      openBuzzing(selectedQuestion.id);
    }
  }, [selectedQuestion?.id]);

  React.useEffect(() => {
    if (!session?.winnerTeamId) return;
    setShowNowPlaying(true);
    if (soundOn) {
      playBuzzerSound();
    }
    const timeout = setTimeout(() => setShowNowPlaying(false), 3000);
    return () => clearTimeout(timeout);
  }, [session?.winnerTeamId, soundOn]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleCreateSession = async () => {
    setCreateError(null);
    setCreating(true);
    try {
      const { code, pin, state } = await api.createSession();
      setSessionCode(code);
      setHostPin(pin);
      setSession(state);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code, pin })
      );
    } catch (err) {
      setCreateError("Session creation failed. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinSession = async () => {
    setJoinError(null);
    try {
      const { state } = await api.hostJoin(sessionCode, hostPin);
      setSession(state);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ code: sessionCode, pin: hostPin })
      );
    } catch (err) {
      setJoinError("Could not join. Check code and pin.");
    }
  };

  const hostAction = async (
    payload: Parameters<typeof api.hostAction>[2]
  ) => {
    if (!sessionCode || !hostPin) return;
    try {
      const { state } = await api.hostAction(sessionCode, hostPin, payload);
      setSession(state);
    } catch (err) {
      console.error("Host action failed:", err);
    }
  };

  const openBuzzing = (questionId?: string) => {
    hostAction({ action: "openBuzzing", questionId });
  };

  const lockBuzzing = () => {
    hostAction({ action: "lockBuzzing" });
  };

  const resetBuzzers = () => {
    hostAction({ action: "resetBuzzers" });
  };

  const updateSettings = (settings: Partial<PublicSessionState["settings"]>) => {
    hostAction({ action: "updateSettings", settings });
  };

  const updateTeam = (teamId: string, patch: { name?: string; color?: string }) => {
    hostAction({ action: "updateTeam", teamId, patch });
  };

  const removeTeam = (teamId: string) => {
    hostAction({ action: "removeTeam", teamId });
  };

  const updateScore = (teamId: string, delta: number) => {
    hostAction({ action: "updateScore", teamId, delta });
  };

  const markQuestionUsed = (questionId: string, used: boolean) => {
    hostAction({ action: "markQuestionUsed", questionId, used });
  };

  const applyBoardEdits = () => {
    if (!editorBoard) return;
    hostAction({ action: "updateBoard", board: editorBoard });
    setEditing(false);
  };

  const exportBoard = () => {
    if (!editorBoard) return;
    const blob = new Blob([JSON.stringify(editorBoard, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "round1-board.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importBoard = async (file: File) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as SeedBoard;
    setEditorBoard(parsed);
  };

  const onScoreQuestion = (teamId: string, result: "correct" | "wrong") => {
    if (!selectedQuestion) return;
    const penaltyMode = session?.settings.wrongPenaltyMode ?? "subtract";
    const delta =
      result === "correct"
        ? selectedQuestion.value
        : penaltyMode === "zero"
        ? 0
        : -selectedQuestion.value;
    updateScore(teamId, delta);
    if (soundOn) {
      result === "correct" ? playCorrectSound() : playWrongSound();
    }
  };

  const renderEditor = () => {
    if (!editorBoard) return null;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
            Question Editor
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportBoard}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
            >
              Export JSON
            </button>
            <label className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10">
              Import JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    importBoard(file);
                  }
                }}
              />
            </label>
          </div>
        </div>
        <div className="mt-4 space-y-6">
          {editorBoard.categories.map((category, categoryIndex) => (
            <div key={`editor-${categoryIndex}`} className="space-y-3">
              <input
                value={category.name}
                onChange={(event) => {
                  const updated = [...editorBoard.categories];
                  updated[categoryIndex] = {
                    ...updated[categoryIndex],
                    name: event.target.value,
                  };
                  setEditorBoard({ categories: updated });
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white"
              />
              <div className="grid gap-3 md:grid-cols-2">
                {category.questions.map((question, questionIndex) => (
                  <div
                    key={`editor-q-${categoryIndex}-${questionIndex}`}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={question.value}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          const updated = [...editorBoard.categories];
                          const questions = [...updated[categoryIndex].questions];
                          questions[questionIndex] = {
                            ...questions[questionIndex],
                            value,
                          };
                          updated[categoryIndex] = {
                            ...updated[categoryIndex],
                            questions,
                          };
                          setEditorBoard({ categories: updated });
                        }}
                        className="w-20 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
                      />
                      <span className="text-xs uppercase tracking-widest text-white/40">
                        Points
                      </span>
                    </div>
                    <textarea
                      value={question.questionText}
                      onChange={(event) => {
                        const updated = [...editorBoard.categories];
                        const questions = [...updated[categoryIndex].questions];
                        questions[questionIndex] = {
                          ...questions[questionIndex],
                          questionText: event.target.value,
                        };
                        updated[categoryIndex] = {
                          ...updated[categoryIndex],
                          questions,
                        };
                        setEditorBoard({ categories: updated });
                      }}
                      className="min-h-[70px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
                    />
                    <textarea
                      value={question.answerText ?? ""}
                      placeholder="Answer text"
                      onChange={(event) => {
                        const updated = [...editorBoard.categories];
                        const questions = [...updated[categoryIndex].questions];
                        questions[questionIndex] = {
                          ...questions[questionIndex],
                          answerText: event.target.value,
                        };
                        updated[categoryIndex] = {
                          ...updated[categoryIndex],
                          questions,
                        };
                        setEditorBoard({ categories: updated });
                      }}
                      className="mt-2 min-h-[50px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyBoardEdits}
            className="rounded-full bg-cyan-500/20 px-4 py-2 text-xs uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/30"
          >
            Apply to Board
          </button>
        </div>
      </div>
    );
  };

  const selectedTeam = session?.teams.find(
    (team) => team.id === session?.winnerTeamId
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-extrabold text-cyan-100">
            Jeopardy Round 1 Host
          </h1>
          <p className="text-white/60">
            Start a new session to generate a join code for teams.
          </p>
          {createError && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
              {createError}
            </p>
          )}
          {joinError && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-amber-200">
              {joinError}
            </p>
          )}
          <button
            type="button"
            onClick={handleCreateSession}
            disabled={creating}
            className="rounded-full bg-cyan-500/30 px-6 py-3 text-sm uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Session"}
          </button>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-200">
              Rejoin Existing Session
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={sessionCode}
                onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
                placeholder="Join code"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
              />
              <input
                value={hostPin}
                onChange={(event) => setHostPin(event.target.value.toUpperCase())}
                placeholder="Host pin"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={handleJoinSession}
              className="mt-4 rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
            >
              Join Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.12),_transparent_50%),_radial-gradient(circle_at_bottom,_rgba(255,77,255,0.12),_transparent_50%)] px-6 py-10 text-white">
      <NowPlaying
        show={showNowPlaying && !reduceMotion}
        teamName={selectedTeam?.name}
      />
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.4em] text-cyan-200">
              Session Code
            </div>
            <div className="text-4xl font-extrabold text-yellow-200">
              {session.code}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">
              Host pin: {hostPin}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                localStorage.setItem(SOUND_KEY, next ? "on" : "off");
              }}
              className="rounded-full border border-cyan-300/30 px-4 py-2 text-xs uppercase tracking-widest text-cyan-100 hover:border-cyan-200"
            >
              Sound {soundOn ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
            >
              Toggle Fullscreen (F)
            </button>
            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
            >
              {editing ? "Close Editor" : "Edit Questions"}
            </button>
          </div>
        </header>

        {editing ? renderEditor() : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Board
            board={session.board}
            activeQuestionId={session.activeQuestionId}
            onSelectQuestion={(question) => setSelectedQuestion(question)}
          />

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                Game Settings
              </div>
              <div className="mt-3 flex flex-col gap-3 text-sm text-white/80">
                <label className="flex items-center justify-between gap-3">
                  <span>Auto-lock after first buzz</span>
                  <input
                    type="checkbox"
                    checked={session.settings.autoLockOnBuzz}
                    onChange={(event) =>
                      updateSettings({ autoLockOnBuzz: event.target.checked })
                    }
                    className="h-4 w-4 accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Wrong penalty mode</span>
                  <select
                    value={session.settings.wrongPenaltyMode}
                    onChange={(event) =>
                      updateSettings({
                        wrongPenaltyMode:
                          event.target.value === "zero" ? "zero" : "subtract",
                      })
                    }
                    className="rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1 text-sm text-white"
                  >
                    <option value="subtract">Subtract points</option>
                    <option value="zero">Zero points</option>
                  </select>
                </label>
              </div>
            </div>

            <TeamList teams={session.teams} onUpdate={updateTeam} onRemove={removeTeam} />

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
                Buzzer Quick Controls
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openBuzzing(session.activeQuestionId)}
                  className="rounded-full bg-cyan-500/20 px-4 py-2 text-xs uppercase tracking-widest text-cyan-100 hover:bg-cyan-400/30"
                >
                  Open Buzzing
                </button>
                <button
                  type="button"
                  onClick={lockBuzzing}
                  className="rounded-full bg-yellow-500/20 px-4 py-2 text-xs uppercase tracking-widest text-yellow-100 hover:bg-yellow-400/30"
                >
                  Lock Buzzing
                </button>
                <button
                  type="button"
                  onClick={resetBuzzers}
                  className="rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/20"
                >
                  Reset Buzzers
                </button>
              </div>
              <div className="mt-2 text-xs text-white/60">
                Active question:{" "}
                <span className="text-white">
                  {session.activeQuestionId ?? "None"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedQuestion ? (
        <QuestionModal
          question={selectedQuestion}
          teams={session.teams}
          buzzingOpen={session.buzzingOpen}
          winnerTeamId={session.winnerTeamId}
          buzzes={session.buzzes}
          onClose={() => setSelectedQuestion(null)}
          onOpenBuzzing={() => openBuzzing(selectedQuestion.id)}
          onLockBuzzing={lockBuzzing}
          onResetBuzzers={resetBuzzers}
          onMarkUsed={(used) => {
            markQuestionUsed(selectedQuestion.id, used);
            if (used) {
              setSelectedQuestion(null);
            }
          }}
          onScore={onScoreQuestion}
          wrongPenaltyMode={session.settings.wrongPenaltyMode}
        />
      ) : null}
    </div>
  );
}
