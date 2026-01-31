import { NextResponse } from "next/server";
import {
  getSession,
  getPublicState,
  updateSessionTimestamp,
  setInStore,
} from "@/lib/sessionStoreServer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { teamId } = (await req.json()) as { teamId: string };
    const session = await getSession(code);
    if (!session) {
      return NextResponse.json({ status: "no-session" }, { status: 404 });
    }

    if (!session.buzzingOpen) {
      return NextResponse.json({
        status: "locked",
        winnerTeamId: session.winnerTeamId,
      });
    }

    if (session.buzzes.some((b) => b.teamId === teamId)) {
      return NextResponse.json({
        status: "already-buzzed",
        winnerTeamId: session.winnerTeamId,
      });
    }

    const attemptedWrong = session.attemptedWrongTeamIds ?? [];
    if (attemptedWrong.includes(teamId)) {
      return NextResponse.json({
        status: "blocked",
        winnerTeamId: session.winnerTeamId,
      });
    }

    session.buzzes.push({ teamId, timestamp: Date.now() });
    if (!session.winnerTeamId) {
      session.winnerTeamId = teamId;
      if (session.settings.autoLockOnBuzz) {
        session.buzzingOpen = false;
      }
    }
    updateSessionTimestamp(session);
    await setInStore(session);

    return NextResponse.json({
      status: "accepted",
      winnerTeamId: session.winnerTeamId,
    });
  } catch (error) {
    console.error("Buzz error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
