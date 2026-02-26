export const getBranchRoomName = (branchId) => `branch:${branchId}`;
const sendAck = (ack, payload) => {
    if (typeof ack === "function") {
        ack(payload);
    }
};
const parseBranchId = (payload) => {
    if (typeof payload === "string") {
        return payload.trim();
    }
    if (payload && typeof payload === "object") {
        const candidate = payload;
        if (typeof candidate.branchId === "string") {
            return candidate.branchId.trim();
        }
    }
    return "";
};
const registerJoinBranchHandler = (socket) => {
    socket.on("join_branch", async (payload, ack) => {
        const branchId = parseBranchId(payload);
        if (!branchId) {
            sendAck(ack, {
                ok: false,
                message: "branchId yuborilishi shart"
            });
            return;
        }
        const room = getBranchRoomName(branchId);
        await socket.join(room);
        sendAck(ack, {
            ok: true,
            room
        });
        socket.emit("joined_branch", {
            branchId,
            room
        });
    });
};
export const registerSocketEvents = (io) => {
    io.on("connection", (socket) => {
        socket.emit("connected", { socketId: socket.id });
        registerJoinBranchHandler(socket);
    });
};
