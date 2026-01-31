import type { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  createSession,
  ensureTeam,
  getPublicState,
  getSession,
  resetBuzzers,
  updateBoardFromSeed,
  updateSessionTimestamp,
} from "@/lib/sessionStore";
import type { SeedBoard, SessionSettings } from "@/lib/types";

type NextApiResponseServerIO = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

type HostAuth = {
  code: string;
  pin: string;
};

function requireHost(sessionCode: string, pin: string) {
  const session = getSession(sessionCode);
  if (!session) {
    return { error: "Session not found." } as const;
  }
  if (session.hostPin !== pin) {
    return { error: "Invalid host pin." } as const;
  }
  return { session } as const;
}

function emitState(io: SocketIOServer, code: string) {
  const session = getSession(code);
  if (!session) return;
  updateSessionTimestamp(session);
  io.to(code).emit("state:sync", getPublicState(session));
}

function handleTeamBuzz(
  io: SocketIOServer,
  payload: { code: string; teamId: string },
  callback?: (response: { status: string; winnerTeamId?: string }) => void
) {
  const session = getSession(payload.code);
  if (!session) {
    callback?.({ status: "no-session" });
    return;
  }

  if (!session.buzzingOpen) {
    callback?.({ status: "locked", winnerTeamId: session.winnerTeamId });
    return;
  }

  if (session.buzzes.find((buzz) => buzz.teamId === payload.teamId)) {
    callback?.({
      status: "already-buzzed",
      winnerTeamId: session.winnerTeamId,
    });
    return;
  }

  const timestamp = Date.now();
  session.buzzes.push({ teamId: payload.teamId, timestamp });

  if (!session.winnerTeamId) {
    session.winnerTeamId = payload.teamId;
    if (session.settings.autoLockOnBuzz) {
      session.buzzingOpen = false;
    }
  }

  emitState(io, session.code);
  callback?.({ status: "accepted", winnerTeamId: session.winnerTeamId });
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket?.server?.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
    });
    res.socket.server.io = io;

    io.on("connection", (socket) => {
      socket.on("host:createSession", (_, callback) => {
        const session = createSession();
        socket.join(session.code);
        callback?.({
          code: session.code,
          pin: session.hostPin,
          state: getPublicState(session),
        });
      });

      socket.on("host:join", (payload: HostAuth, callback) => {
        const result = requireHost(payload.code, payload.pin);
        if ("error" in result) {
          callback?.({ error: result.error });
          return;
        }
        socket.join(payload.code);
        callback?.({ state: getPublicState(result.session) });
      });

      socket.on(
        "team:join",
        (
          payload: { code: string; teamName: string; teamId?: string },
          callback
        ) => {
          const session = getSession(payload.code);
          if (!session) {
            callback?.({ error: "Session not found." });
            return;
          }

          const team = ensureTeam(session, payload.teamName, payload.teamId);
          socket.join(payload.code);

          emitState(io, payload.code);
          callback?.({ teamId: team.id, state: getPublicState(session) });
        }
      );

      socket.on("team:buzz", (payload: unknown, callback: (r: unknown) => void) =>
        handleTeamBuzz(io, payload as { code: string; teamId: string }, callback)
      );

      socket.on(
        "host:openBuzzing",
        (payload: HostAuth & { questionId?: string }) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          result.session.buzzingOpen = true;
          result.session.winnerTeamId = undefined;
          result.session.buzzes = [];
          result.session.activeQuestionId = payload.questionId;
          emitState(io, payload.code);
        }
      );

      socket.on("host:lockBuzzing", (payload: HostAuth) => {
        const result = requireHost(payload.code, payload.pin);
        if ("error" in result) return;
        result.session.buzzingOpen = false;
        emitState(io, payload.code);
      });

      socket.on("host:resetBuzzers", (payload: HostAuth) => {
        const result = requireHost(payload.code, payload.pin);
        if ("error" in result) return;
        resetBuzzers(result.session);
        emitState(io, payload.code);
      });

      socket.on(
        "host:updateSettings",
        (payload: HostAuth & { settings: Partial<SessionSettings> }) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          result.session.settings = {
            ...result.session.settings,
            ...payload.settings,
          };
          emitState(io, payload.code);
        }
      );

      socket.on(
        "host:updateTeam",
        (
          payload: HostAuth & {
            teamId: string;
            patch: { name?: string; color?: string; icon?: string };
          }
        ) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          const team = result.session.teams.find(
            (entry) => entry.id === payload.teamId
          );
          if (!team) return;
          team.name = payload.patch.name ?? team.name;
          team.icon = payload.patch.icon ?? team.icon;
          if (payload.patch.color) {
            team.color = payload.patch.color;
          }
          emitState(io, payload.code);
        }
      );

      socket.on("host:removeTeam", (payload: HostAuth & { teamId: string }) => {
        const result = requireHost(payload.code, payload.pin);
        if ("error" in result) return;
        result.session.teams = result.session.teams.filter(
          (team) => team.id !== payload.teamId
        );
        result.session.buzzes = result.session.buzzes.filter(
          (buzz) => buzz.teamId !== payload.teamId
        );
        if (result.session.winnerTeamId === payload.teamId) {
          result.session.winnerTeamId = undefined;
        }
        emitState(io, payload.code);
      });

      socket.on(
        "host:updateScore",
        (payload: HostAuth & { teamId: string; delta: number }) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          const team = result.session.teams.find(
            (entry) => entry.id === payload.teamId
          );
          if (!team) return;
          team.score += payload.delta;
          emitState(io, payload.code);
        }
      );

      socket.on(
        "host:updateBoard",
        (payload: HostAuth & { board: SeedBoard }) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          updateBoardFromSeed(result.session, payload.board);
          emitState(io, payload.code);
        }
      );

      socket.on(
        "host:markQuestionUsed",
        (payload: HostAuth & { questionId: string; used: boolean }) => {
          const result = requireHost(payload.code, payload.pin);
          if ("error" in result) return;
          for (const category of result.session.board) {
            const question = category.questions.find(
              (entry) => entry.id === payload.questionId
            );
            if (question) {
              question.used = payload.used;
              break;
            }
          }
          emitState(io, payload.code);
        }
      );

      socket.on("disconnect", () => {
        socket.removeAllListeners();
      });
    });
  }

  res.status(200).json({ ok: true });
}
