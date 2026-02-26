import type { Server, Socket } from "socket.io";

export const getBranchRoomName = (branchId: string) => `branch:${branchId}`;

type AckFn = (payload: { ok: boolean; message?: string; room?: string }) => void;

const sendAck = (ack: unknown, payload: { ok: boolean; message?: string; room?: string }) => {
  if (typeof ack === "function") {
    (ack as AckFn)(payload);
  }
};

const parseBranchId = (payload: unknown) => {
  if (typeof payload === "string") {
    return payload.trim();
  }

  if (payload && typeof payload === "object") {
    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.branchId === "string") {
      return candidate.branchId.trim();
    }
  }

  return "";
};

const registerJoinBranchHandler = (socket: Socket) => {
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

export const registerSocketEvents = (io: Server) => {
  io.on("connection", (socket) => {
    socket.emit("connected", { socketId: socket.id });
    registerJoinBranchHandler(socket);
  });
};
