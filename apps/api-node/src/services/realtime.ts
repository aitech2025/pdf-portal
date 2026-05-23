import type { FastifyInstance } from "fastify";
import type { IncomingMessage } from "node:http";

type Subscriber = {
  userId: string;
  socket: { send: (data: string) => void; close: () => void; on: (event: string, cb: () => void) => void };
};

const subscribers = new Set<Subscriber>();

const tokenFromRequest = (request: IncomingMessage): string | null => {
  const url = new URL(request.url ?? "", "http://localhost");
  return url.searchParams.get("token");
};

export const registerRealtimeRoutes = (app: FastifyInstance): void => {
  app.get("/api/notifications/ws", { websocket: true }, async (connection, req) => {
    try {
      const token = tokenFromRequest(req.raw);
      if (!token) {
        connection.socket.close();
        return;
      }
      const payload = app.jwt.verify<{ sub: string }>(token);
      const subscriber: Subscriber = { userId: payload.sub, socket: connection.socket };
      subscribers.add(subscriber);
      connection.socket.on("close", () => subscribers.delete(subscriber));
    } catch {
      connection.socket.close();
    }
  });
};

export const pushNotification = (userId: string, data: unknown): void => {
  const message = JSON.stringify({ event: "notifications:create", data });
  for (const subscriber of subscribers) {
    if (subscriber.userId === userId) {
      subscriber.socket.send(message);
    }
  }
};
