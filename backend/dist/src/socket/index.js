import { Server as SocketIOServer } from "socket.io";
import { config } from "../config.js";
import { getBranchRoomName, registerSocketEvents } from "./events.js";
let ioInstance = null;
export const initSocket = (httpServer) => {
    if (ioInstance) {
        return ioInstance;
    }
    ioInstance = new SocketIOServer(httpServer, {
        cors: {
            origin: config.corsOrigin === "*" ? true : config.corsOrigin,
            credentials: true
        }
    });
    registerSocketEvents(ioInstance);
    return ioInstance;
};
export const getIo = () => {
    if (!ioInstance) {
        throw new Error("Socket server hali ishga tushmagan");
    }
    return ioInstance;
};
export const emitToBranch = (branchId, event, payload) => {
    const io = getIo();
    io.to(getBranchRoomName(branchId)).emit(event, payload);
};
