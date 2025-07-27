import { parseIsolatedEntityName } from 'typescript';
import { WebSocketServer, WebSocket }   from 'ws';

const wss = new WebSocketServer({ port: 8080 });

interface Room {
    sockets: WebSocket[]
}
const rooms : Record<string, Room> = {};

interface Data {
    type: string,
    room: string,
    message?: string
}

wss.on('connection', (ws) => {
    ws.on('message', (data : Buffer) => {
        const parsedData : Data = JSON.parse(data.toString());

        if(parsedData.type === 'join-room'){
            if(!rooms[parsedData.room]) rooms[parsedData.room] = { sockets: [ws] };
            else rooms[parsedData.room]!.sockets.push(ws);
            ws.send("joined room");
        }
        else if(parsedData.type === 'chat' && parsedData.message){
            // broadcast to others
            for(const socket of rooms[parsedData.room]!.sockets){
                socket.send(JSON.stringify({ msg : parsedData.message! }))
            }
            ws.send(JSON.stringify({
                type: "success",
                msg: "successfully broadcasted"
            }))
        }
        else {
            ws.close()
        }
    })
})


