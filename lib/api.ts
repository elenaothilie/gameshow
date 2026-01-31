/**
 * Client-side API for session operations. Uses REST + polling for
 * Vercel/serverless compatibility.
 */
import type { PublicSessionState, SeedBoard } from "./types";

const POLL_INTERVAL = 200;

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}

export async function createSession(): Promise<{
  code: string;
  pin: string;
  state: PublicSessionState;
}> {
  return api("/api/session/create", { method: "POST" });
}

export async function hostJoin(
  code: string,
  pin: string
): Promise<{ state: PublicSessionState }> {
  const cleanCode = code.trim().toUpperCase();
  return api("/api/session/host-join", {
    method: "POST",
    body: JSON.stringify({ code: cleanCode, pin }),
  });
}

export async function getSessionState(
  code: string
): Promise<PublicSessionState> {
  const cleanCode = code.trim().toUpperCase();
  return api(`/api/session/${encodeURIComponent(cleanCode)}`);
}

export async function teamJoin(
  code: string,
  teamName: string,
  teamId?: string
): Promise<{ teamId: string; state: PublicSessionState }> {
  const cleanCode = code.trim().toUpperCase();
  return api(`/api/session/${encodeURIComponent(cleanCode)}/team-join`, {
    method: "POST",
    body: JSON.stringify({ teamName: teamName.trim(), teamId }),
  });
}

export async function buzz(
  code: string,
  teamId: string
): Promise<{ status: string; winnerTeamId?: string }> {
  const cleanCode = code.trim().toUpperCase();
  return api(`/api/session/${encodeURIComponent(cleanCode)}/buzz`, {
    method: "POST",
    body: JSON.stringify({ teamId }),
  });
}

type HostAction =
  | { action: "openBuzzing"; questionId?: string }
  | { action: "lockBuzzing" }
  | { action: "resetBuzzers" }
  | { action: "updateSettings"; settings: Partial<PublicSessionState["settings"]> }
  | { action: "updateTeam"; teamId: string; patch: { name?: string; color?: string } }
  | { action: "removeTeam"; teamId: string }
  | { action: "updateScore"; teamId: string; delta: number }
  | { action: "updateBoard"; board: SeedBoard }
  | {
      action: "markQuestionUsed";
      questionId: string;
      used: boolean;
    };

export async function hostAction(
  code: string,
  pin: string,
  payload: HostAction
): Promise<{ state: PublicSessionState }> {
  const cleanCode = code.trim().toUpperCase();
  const body =
    payload.action === "markQuestionUsed"
      ? { code: cleanCode, pin, ...payload, questionIdUsed: payload.questionId }
      : { code: cleanCode, pin, ...payload };
  return api(`/api/session/${encodeURIComponent(cleanCode)}/host`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function pollSession(
  code: string,
  onState: (state: PublicSessionState) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;

  const poll = async () => {
    if (cancelled) return;
    try {
      const state = await getSessionState(code);
      if (!cancelled) onState(state);
    } catch (err) {
      if (!cancelled) onError?.(err as Error);
    }
    if (!cancelled) {
      setTimeout(poll, POLL_INTERVAL);
    }
  };

  poll();
  return () => {
    cancelled = true;
  };
}
