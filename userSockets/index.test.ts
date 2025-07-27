import { WebSocket } from "ws"
import { describe, expect, it } from "bun:test"

const URL = process.env.WEBSOCKET_URL ? process.env.WEBSOCKET_URL : "ws://localhost:8080"

describe("creating room and testing with non scalable chat app",()=> {
    it("connection-check", (done)=> {
        const socket = new WebSocket(URL);

        socket.onopen = () => {
            expect(socket.readyState).toBe(WebSocket.OPEN);
            socket.close();
            done();
        };
        socket.onerror = () => {
            done(new Error("Failed to connect to server"));
        };
    });
    
    it("join-room",(done)=>{
        const socket = new WebSocket(URL);
        const data = {
            type: "join-room",
            room:"1",
        }
        socket.onopen = () => {
            socket.send(JSON.stringify(data));
        }
        socket.onmessage = (event)=> {
            expect(event.data).toBe("joined room");
            socket.close()
            done()
        }   
        socket.onerror = () => {
            done(new Error("WebSocket error during join-room"));
        }
    })

    it("chat", (done) => {
        const socket = new WebSocket(URL);

        const joinRoomData = {
            type: "join-room",
            room: "1"
        };

        const chatData = {
            type: "chat",
            room: "1",
            message: "Hello guys the shit is here"
        };

        let hasJoined = false;
        let hasSeenSuccess = false;

        socket.onopen = () => {
            socket.send(JSON.stringify(joinRoomData));
        };

        socket.onmessage = (event) => {
            const msg = event.data.toString();

            console.log(event.data)
            if (msg === "joined room") {
                hasJoined = true;
                socket.send(JSON.stringify(chatData));
                return;
            }
            // Try to parse JSON message
            let res;
            try {
                res = JSON.parse(msg);
            } catch (err) {
                return;
            }

            if (res.type === "success") {
                expect(res.msg).toBe("successfully broadcasted");
                hasSeenSuccess = true;
                socket.close();
                done();
            } else if (res.msg === chatData.message) {
                return;
            } else {
                done(new Error("Unexpected message: " + JSON.stringify(res)));
            }
        };
        socket.onerror = () => {
            done(new Error("WebSocket error during chat"));
        };
    });

    
})