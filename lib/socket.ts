import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export async function getSocket() {
  if (socket) return socket;
  await fetch("/api/socket");
  socket = io({
    path: "/api/socket",
    addTrailingSlash: false,
  });
  return socket;
}

export function disconnectSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
}
