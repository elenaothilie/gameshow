import { NextResponse } from "next/server";
import {
  getSession,
  getPublicState,
  resetBuzzers,
  updateBoardFromSeed,
  updateSessionTimestamp,
  setInStore,
} from "@/lib/sessionStoreServer";
import type { SeedBoard, SessionSettings } from "@/lib/types";

async function requireHost(code: string, pin: string) {
  const session = await getSession(code);
  if (!session) return { error: "Session not found." } as const;
  if (session.hostPin !== pin) return { error: "Invalid host pin." } as const;
  return { session } as const;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const body = (await req.json()) as {
      pin: string;
      action: string;
      questionId?: string;
      settings?: Partial<SessionSettings>;
      teamId?: string;
      patch?: { name?: string; color?: string; icon?: string };
      delta?: number;
      board?: SeedBoard;
      questionIdUsed?: string;
      used?: boolean;
    };

    const { pin, action } = body;
    const result = await requireHost(code, pin);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }
    const { session } = result;

    switch (action) {
      case "openBuzzing":
        session.buzzingOpen = true;
        session.winnerTeamId = undefined;
        session.buzzes = [];
        session.attemptedWrongTeamIds = [];
        session.activeQuestionId = body.questionId;
        break;
      case "lockBuzzing":
        session.buzzingOpen = false;
        session.winnerTeamId = undefined;
        session.buzzes = [];
        session.activeQuestionId = undefined;
        break;
      case "resetBuzzers":
        resetBuzzers(session);
        break;
      case "updateSettings":
        if (body.settings) {
          session.settings = { ...session.settings, ...body.settings };
        }
        break;
      case "updateTeam":
        if (body.teamId && body.patch) {
          const team = session.teams.find((t) => t.id === body.teamId);
          if (team) {
            team.name = body.patch.name ?? team.name;
            team.icon = body.patch.icon ?? team.icon;
            if (body.patch.color) team.color = body.patch.color;
          }
        }
        break;
      case "removeTeam":
        if (body.teamId) {
          session.teams = session.teams.filter((t) => t.id !== body.teamId);
          session.buzzes = session.buzzes.filter((b) => b.teamId !== body.teamId);
          session.attemptedWrongTeamIds = (session.attemptedWrongTeamIds ?? []).filter(
            (id) => id !== body.teamId
          );
          if (session.winnerTeamId === body.teamId) {
            session.winnerTeamId = undefined;
          }
        }
        break;
      case "updateScore":
        if (body.teamId != null && body.delta != null) {
          const team = session.teams.find((t) => t.id === body.teamId);
          if (team) team.score += body.delta;
        }
        break;
      case "scoreWrongReopen":
        if (body.teamId != null) {
          const team = session.teams.find((t) => t.id === body.teamId);
          const q = body.questionId
            ? session.board.flatMap((c) => c.questions).find((qu) => qu.id === body.questionId)
            : undefined;
          const delta = q ? -q.value : 0;
          if (team) team.score += delta;
          session.attemptedWrongTeamIds = [...(session.attemptedWrongTeamIds ?? []), body.teamId];
          session.winnerTeamId = undefined;
          session.buzzes = [];
          session.buzzingOpen = true;
        }
        break;
      case "updateBoard":
        if (body.board) {
          updateBoardFromSeed(session, body.board);
        }
        break;
      case "markQuestionUsed":
        if (body.questionIdUsed != null && body.used != null) {
          for (const category of session.board) {
            const q = category.questions.find(
              (qu) => qu.id === body.questionIdUsed
            );
            if (q) {
              q.used = body.used;
              break;
            }
          }
        }
        break;
      case "scoreCorrectAndClose":
        if (body.teamId != null && body.questionId != null) {
          const team = session.teams.find((t) => t.id === body.teamId);
          const q = session.board
            .flatMap((c) => c.questions)
            .find((qu) => qu.id === body.questionId);
          if (team && q) {
            team.score += q.value;
            q.used = true;
          }
          session.buzzingOpen = false;
          session.winnerTeamId = undefined;
          session.buzzes = [];
          session.activeQuestionId = undefined;
        }
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    updateSessionTimestamp(session);
    await setInStore(session);
    return NextResponse.json({ state: getPublicState(session) });
  } catch (error) {
    console.error("Host action error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
