import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@devteam/shared";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _io: Server<any, any> | null = null;

export function setIo(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  _io = io as any;
}

export function getIo(): Server<ClientToServerEvents, ServerToClientEvents> {
  if (!_io) throw new Error("Socket.io not initialized");
  return _io;
}

export function emitToChannel(
  channelId: string,
  event: keyof ServerToClientEvents,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): void {
  _io?.to(channelId).emit(event as string, payload);
}

export function emitToProject(
  projectId: string,
  event: keyof ServerToClientEvents,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): void {
  _io?.to(`project:${projectId}`).emit(event as string, payload);
}

export function broadcastAll(
  event: keyof ServerToClientEvents,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any
): void {
  _io?.emit(event as string, payload);
}
