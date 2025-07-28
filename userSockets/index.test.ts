import { WebSocket } from "ws";
import { describe, expect, it } from "bun:test";

const URL1 = process.env.WEBSOCKET_URL || "ws://localhost:8080";
const URL2 = "ws://localhost:8081"; // Second instance (relayer-connected)

describe("WebSocket Chat App", () => {
    it("connects to server", (done) => {
        const socket = new WebSocket(URL1);

        socket.onopen = () => {
            expect(socket.readyState).toBe(WebSocket.OPEN);
            socket.close();
            done();
        };

        socket.onerror = () => done(new Error("Connection failed"));
    });

    it("joins a room", (done) => {
        const socket = new WebSocket(URL1);

        socket.onopen = () => {
            socket.send(JSON.stringify({ type: "join-room", room: "1" }));
        };

        socket.onmessage = (event) => {
            const msg = event.data.toString();
            if (msg === "joined room") {
                expect(msg).toBe("joined room");
                socket.close();
                done();
            }
        };

        socket.onerror = () => done(new Error("Join-room failed"));
    });

    it("sends and receives chat message", (done) => {
        const socket = new WebSocket(URL1);

        const joinRoom = { type: "join-room", room: "1" };
        const message = { type: "chat", room: "1", message: "Hello world" };

        socket.onopen = () => {
            socket.send(JSON.stringify(joinRoom));
        };

        socket.onmessage = (event) => {
            const raw = event.data.toString();

            if (raw === "joined room" || raw === "success") {
                socket.send(JSON.stringify(message));
                return;
            }

            try {
                const data = JSON.parse(raw);
                if (data.message === message.message) {
                    expect(data.message).toBe(message.message);
                    socket.close();
                    done();
                }
            } catch (e) {
                // Skip non-JSON messages
            }
        };

        socket.onerror = () => done(new Error("Chat failed"));
    });

    it("relayer broadcasts message across instances", (done) => {
        const ws1 = new WebSocket(URL1);
        const ws2 = new WebSocket(URL2);

        const joinRoom = { type: "join-room", room: "room-relay" };
        const chat = { type: "chat", room: "room-relay", message: "From ws1 across relayer" };

        let joined1 = false;
        let joined2 = false;
        let chatReceived = false;

        const timeout = setTimeout(() => {
            if (!chatReceived) done(new Error("Test timed out"));
        }, 5000);

        ws1.onopen = () => ws1.send(JSON.stringify(joinRoom));
        ws2.onopen = () => ws2.send(JSON.stringify(joinRoom));

        ws1.onmessage = (event) => {
            const msg = event.data.toString();
            if (msg === "joined room" && !joined1) {
                joined1 = true;
                setTimeout(() => {
                    ws1.send(JSON.stringify(chat));
                }, 100); // slight delay
            }
        };

        ws2.onmessage = (event) => {
            const raw = event.data.toString();

            if (raw === "joined room") {
                joined2 = true;
                return;
            }

            try {
                const data = JSON.parse(raw);
                if (data.message === chat.message) {
                    expect(data.message).toBe(chat.message);
                    chatReceived = true;
                    clearTimeout(timeout);
                    ws1.close();
                    ws2.close();
                    done();
                }
            } catch (e) {

            }
        };

        ws1.onerror = () => done(new Error("WS1 failed"));
        ws2.onerror = () => done(new Error("WS2 failed"));
    });
});
