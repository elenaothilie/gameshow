import { NextResponse } from "next/server";
import {
  getSession,
  getPublicState,
  ensureTeam,
  updateSessionTimestamp,
  setInStore,
} from "@/lib/sessionStoreServer";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  try {
    const { teamName, teamId } = (await req.json()) as {
      teamName: string;
      teamId?: string;
    };
    const session = await getSession(code);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    const team = ensureTeam(session, teamName, teamId);
    updateSessionTimestamp(session);
    await setInStore(session);
    return NextResponse.json({
      teamId: team.id,
      state: getPublicState(session),
    });
  } catch (error) {
    console.error("Team join error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
