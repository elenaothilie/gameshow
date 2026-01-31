import { NextResponse } from "next/server";
import {
  createSession,
  getPublicState,
} from "@/lib/sessionStoreServer";

export async function POST() {
  try {
    const session = await createSession();
    return NextResponse.json({
      code: session.code,
      pin: session.hostPin,
      state: getPublicState(session),
    });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
