"use client";

import React from "react";
import { Board } from "@/components/Board";
import { QuestionModal } from "@/components/QuestionModal";
import { TeamList } from "@/components/TeamList";
import { ScoreTicker } from "@/components/ScoreTicker";
import * as api from "@/lib/api";
import { playCorrectSound, playWrongSound } from "@/lib/sounds";
import type { PublicSessionState, Question, SeedBoard } from "@/lib/types";

const STORAGE_KEY = "jeopardy:host";

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
  const [session, setSession] = React.useState<PublicSessionState | null>(null);
  const [sessionCode, setSessionCode] = React.useState("");
  const [hostPin, setHostPin] = React.useState("");
  const [selectedQuestion, setSelectedQuestion] = React.useState<Question | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [editorBoard, setEditorBoard] = React.useState<SeedBoard | null>(null);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as { code: string; pin: string };
      setSessionCode(parsed.code);
      setHostPin(parsed.pin);
    }
  }, []);

  React.useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  React.useEffect(() => {
    if (!sessionCode || !session) return;
    return api.pollSession(sessionCode, (newState) => {
      setSession((prev) => {
        if (!prev) return newState;
        if (newState.lastUpdatedAt > prev.lastUpdatedAt) return newState;
        return prev;
      });
    });
  }, [sessionCode, !!session]);

  React.useEffect(() => {
    if (!sessionCode || !hostPin || session) return;
    let active = true;
    api.hostJoin(sessionCode, hostPin)
      .then(({ state }) => {
        if (active) setSession(state);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sessionCode, hostPin]);

  React.useEffect(() => {
    if (!session) return;
    if (!editing) setEditorBoard(boardToSeed(session.board));
  }, [session, editing]);

  React.useEffect(() => {
    if (!session || !selectedQuestion) return;
    for (const category of session.board) {
      const match = category.questions.find((q) => q.id === selectedQuestion.id);
      if (match) {
        setSelectedQuestion(match);
        break;
      }
    }
  }, [session, selectedQuestion]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") toggleFullscreen();
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code, pin }));
    } catch {
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ code: sessionCode, pin: hostPin }));
    } catch {
      setJoinError("Could not join. Check code and pin.");
    }
  };

  const hostAction = async (payload: Parameters<typeof api.hostAction>[2]) => {
    if (!sessionCode || !hostPin) return;
    try {
      const { state } = await api.hostAction(sessionCode, hostPin, payload);
      setSession(state);
    } catch (err) {
      console.error("Host action failed:", err);
    }
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

  const handleSelectQuestion = (question: Question) => {
    setSelectedQuestion(question);
    if (sessionCode && hostPin && !question.used) {
      api.hostAction(sessionCode, hostPin, {
        action: "openBuzzing",
        questionId: question.id,
      }).then(({ state }) => setSession(state)).catch((err) => console.error("Open buzzing failed:", err));
    }
  };

  const handleCloseModal = () => {
    setSelectedQuestion(null);
    hostAction({ action: "lockBuzzing" });
  };

  const onScoreQuestion = async (result: "correct" | "wrong") => {
    if (!selectedQuestion || !session?.winnerTeamId) return;
    const winnerId = session.winnerTeamId;
    if (result === "correct") {
      playCorrectSound();
      await hostAction({ action: "updateScore", teamId: winnerId, delta: selectedQuestion.value });
      await hostAction({ action: "markQuestionUsed", questionId: selectedQuestion.id, used: true });
      handleCloseModal();
    } else {
      playWrongSound();
      await hostAction({
        action: "scoreWrongReopen",
        teamId: winnerId,
        questionId: selectedQuestion.id,
      });
    }
  };

  const renderEditor = () => {
    if (!editorBoard) return null;
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <div className="text-sm uppercase tracking-[0.25em] text-cyan-200">
          Question Editor
        </div>
        <div className="mt-4 space-y-6">
          {editorBoard.categories.map((category, categoryIndex) => (
            <div key={categoryIndex} className="space-y-3">
              <input
                value={category.name}
                onChange={(e) => {
                  const updated = [...editorBoard.categories];
                  updated[categoryIndex] = { ...updated[categoryIndex], name: e.target.value };
                  setEditorBoard({ categories: updated });
                }}
                className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white"
              />
              <div className="grid gap-3 md:grid-cols-2">
                {category.questions.map((question, questionIndex) => (
                  <div
                    key={questionIndex}
                    className="rounded-xl border border-white/10 bg-slate-950/40 p-3"
                  >
                    <input
                      type="number"
                      value={question.value}
                      onChange={(e) => {
                        const updated = [...editorBoard.categories];
                        const questions = [...updated[categoryIndex].questions];
                        questions[questionIndex] = { ...questions[questionIndex], value: Number(e.target.value) };
                        updated[categoryIndex] = { ...updated[categoryIndex], questions };
                        setEditorBoard({ categories: updated });
                      }}
                      className="mb-2 w-20 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
                    />
                    <textarea
                      value={question.questionText}
                      onChange={(e) => {
                        const updated = [...editorBoard.categories];
                        const questions = [...updated[categoryIndex].questions];
                        questions[questionIndex] = { ...questions[questionIndex], questionText: e.target.value };
                        updated[categoryIndex] = { ...updated[categoryIndex], questions };
                        setEditorBoard({ categories: updated });
                      }}
                      className="min-h-[70px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-sm text-white"
                    />
                    <textarea
                      value={question.answerText ?? ""}
                      placeholder="Answer"
                      onChange={(e) => {
                        const updated = [...editorBoard.categories];
                        const questions = [...updated[categoryIndex].questions];
                        questions[questionIndex] = { ...questions[questionIndex], answerText: e.target.value };
                        updated[categoryIndex] = { ...updated[categoryIndex], questions };
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

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-4xl font-extrabold text-cyan-100">
            Jeopardy Round 1 Host
          </h1>
          <p className="text-white/60">Start a new session to generate a join code for teams.</p>
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
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Join code"
                className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white"
              />
              <input
                value={hostPin}
                onChange={(e) => setHostPin(e.target.value.toUpperCase())}
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

  const teamsOverview = (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {session.teams.map((team) => (
        <div
          key={team.id}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2"
        >
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: team.color }}
          />
          <span className="font-semibold text-white">{team.name}</span>
          <span className="text-lg font-bold text-yellow-200">
            <ScoreTicker value={team.score} />
          </span>
        </div>
      ))}
      {session.teams.length === 0 && (
        <span className="text-white/50">No teams joined yet</span>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(0,229,255,0.12),_transparent_50%),_radial-gradient(circle_at_bottom,_rgba(255,77,255,0.12),_transparent_50%)] px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {!isFullscreen && (
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/60 px-6 py-4">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-cyan-200">Session Code</div>
              <div className="text-4xl font-extrabold text-yellow-200">{session.code}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">
                Host pin: {hostPin}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
              >
                Fullscreen (F)
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
        )}

        {isFullscreen && (
          <div className="rounded-xl border border-white/10 bg-slate-950/60 px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="text-2xl font-extrabold text-yellow-200">{session.code}</div>
              {teamsOverview}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-widest text-white/70 hover:bg-white/10"
              >
                Exit Fullscreen
              </button>
            </div>
          </div>
        )}

        {editing && !isFullscreen ? renderEditor() : null}

        <div className={isFullscreen ? "" : "grid gap-6 lg:grid-cols-[2fr_1fr]"}>
          <Board
            board={session.board}
            activeQuestionId={session.activeQuestionId}
            onSelectQuestion={handleSelectQuestion}
          />

          {!isFullscreen && (
            <div className="space-y-4">
              <TeamList teams={session.teams} onUpdate={updateTeam} onRemove={removeTeam} />
            </div>
          )}
        </div>
      </div>

      {selectedQuestion ? (
        <QuestionModal
          question={selectedQuestion}
          teams={session.teams}
          winnerTeamId={session.winnerTeamId}
          onClose={handleCloseModal}
          onMarkUsed={(used) => {
            markQuestionUsed(selectedQuestion.id, used);
            if (used) handleCloseModal();
          }}
          onScore={onScoreQuestion}
        />
      ) : null}
    </div>
  );
}
