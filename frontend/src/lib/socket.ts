import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@devteam/shared";
import { getToken } from "./api";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000", {
      transports: ["websocket"],
      autoConnect: true,
      auth: { token: getToken() },
    });
  }
  return socket;
}

export function resetSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
