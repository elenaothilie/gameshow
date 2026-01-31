import { NextResponse } from "next/server";
import { getSession, getPublicState } from "@/lib/sessionStoreServer";

export async function POST(req: Request) {
  try {
    const { code, pin } = (await req.json()) as { code: string; pin: string };
    const session = await getSession(code);
    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }
    if (session.hostPin !== pin) {
      return NextResponse.json({ error: "Invalid host pin." }, { status: 403 });
    }
    return NextResponse.json({ state: getPublicState(session) });
  } catch (error) {
    console.error("Host join error:", error);
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
