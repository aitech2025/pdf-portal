const subscribers = new Set();
const tokenFromRequest = (request) => {
    const url = new URL(request.url ?? "", "http://localhost");
    return url.searchParams.get("token");
};
export const registerRealtimeRoutes = (app) => {
    app.get("/api/notifications/ws", { websocket: true }, async (connection, req) => {
        try {
            const token = tokenFromRequest(req.raw);
            if (!token) {
                connection.socket.close();
                return;
            }
            const payload = app.jwt.verify(token);
            const subscriber = { userId: payload.sub, socket: connection.socket };
            subscribers.add(subscriber);
            connection.socket.on("close", () => subscribers.delete(subscriber));
        }
        catch {
            connection.socket.close();
        }
    });
};
export const pushNotification = (userId, data) => {
    const message = JSON.stringify({ event: "notifications:create", data });
    for (const subscriber of subscribers) {
        if (subscriber.userId === userId) {
            subscriber.socket.send(message);
        }
    }
};
