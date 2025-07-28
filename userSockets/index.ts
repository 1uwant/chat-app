import { WebSocketServer, WebSocket } from 'ws';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '8080');
const REDIS_URL = process.env.REDIS_URL!;

const wss = new WebSocketServer({ port });

const publisher = createClient({ url: REDIS_URL });
const subscriber = createClient({ url: REDIS_URL });

interface Room {
    sockets: WebSocket[];
}
const rooms: Record<string, Room> = {};

interface Data {
    type: string;
    room: string;
    message?: string;
}

await publisher.connect();
await subscriber.connect();

// Listen to relayed messages
await subscriber.subscribe("chat-relay", (msg) => {
    const parsed = JSON.parse(msg);
    const { room, message } = parsed;

    const sockets = rooms[room]?.sockets || [];
    sockets.forEach(socket => {
        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ message }));
        }
    });
});

wss.on("connection", (ws) => {
    ws.on("message", async (data: Buffer) => {
        const parsedData: Data = JSON.parse(data.toString());

        if (parsedData.type === "join-room") {
            const room = parsedData.room;
            if (!rooms[room]) rooms[room] = { sockets: [] };
            rooms[room].sockets.push(ws);

            ws.send("joined room");

        } else if (parsedData.type === "chat" && parsedData.message) {
            // Forward to Redis → picked up by relayer
            await publisher.publish("chat", JSON.stringify({
                room: parsedData.room,
                message: parsedData.message
            }));
            ws.send("success");
        } else {
            ws.close();
        }
    });
});
