import { createServer } from "node:http";
import { app } from "./app.js";
import { config } from "./config.js";
import { initSocket } from "./socket/index.js";
const httpServer = createServer(app);
export const io = initSocket(httpServer);
app.set("io", io);
httpServer.listen(config.port, () => {
    console.log(`Server ishga tushdi: http://localhost:${config.port}`);
});
