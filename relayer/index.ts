import { createClient } from "redis";
import * as dotenv from 'dotenv';
dotenv.config();

const publisher = createClient({ url: process.env.REDIS_URL });
const subscriber = createClient({ url: process.env.REDIS_URL });

async function publishChat(channel: string, msg: string) {
    await publisher.publish(channel, msg);
}

(async () => {
    await publisher.connect();
    await subscriber.connect();

    await subscriber.subscribe("chat", (msg) => {
        publishChat("chat-relay", msg);
    });
})();
