import { io, Socket } from 'socket.io-client';

export type RealtimeEventName =
  | 'connected'
  | 'joined_branch'
  | 'tables.updated'
  | 'order.updated'
  | 'order.closed'
  | 'products.updated'
  | 'inventory.updated'
  | 'join_branch_ack'
  | 'qr.order.created'
  | 'qr.order.accepted'
  | 'qr.order.rejected'
  | 'service.request.created'
  | 'service.request.acknowledged'
  | 'service.request.completed';

export interface RealtimeEvent<T = unknown> {
  event: RealtimeEventName;
  payload: T;
}

type RealtimeListener = (event: RealtimeEvent) => void;

const SOCKET_URL =
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_SOCKET_URL ?? undefined;

let socket: Socket | null = null;
let currentBranchId: string | null = null;
const listeners = new Set<RealtimeListener>();

const notify = (event: RealtimeEventName, payload: unknown) => {
  for (const listener of listeners) {
    listener({ event, payload });
  }
};

const joinBranch = (branchId: string) => {
  if (!socket || !branchId) return;

  socket.emit('join_branch', { branchId }, (ack: unknown) => {
    notify('join_branch_ack', ack);
  });
};

const bindSocketEvents = (instance: Socket) => {
  instance.on('connect', () => {
    if (currentBranchId) {
      joinBranch(currentBranchId);
    }
  });

  instance.on('connected', (payload) => notify('connected', payload));
  instance.on('joined_branch', (payload) => notify('joined_branch', payload));
  instance.on('tables.updated', (payload) => notify('tables.updated', payload));
  instance.on('order.updated', (payload) => notify('order.updated', payload));
  instance.on('order.closed', (payload) => notify('order.closed', payload));
  instance.on('products.updated', (payload) => notify('products.updated', payload));
  instance.on('inventory.updated', (payload) => notify('inventory.updated', payload));
  instance.on('qr.order.created', (payload) => notify('qr.order.created', payload));
  instance.on('qr.order.accepted', (payload) => notify('qr.order.accepted', payload));
  instance.on('qr.order.rejected', (payload) => notify('qr.order.rejected', payload));
  instance.on('service.request.created', (payload) => notify('service.request.created', payload));
  instance.on('service.request.acknowledged', (payload) =>
    notify('service.request.acknowledged', payload)
  );
  instance.on('service.request.completed', (payload) =>
    notify('service.request.completed', payload)
  );
};

export const connectRealtime = (branchId: string) => {
  if (!branchId) return;

  if (socket && currentBranchId !== branchId) {
    socket.disconnect();
    socket = null;
  }

  currentBranchId = branchId;

  if (!socket) {
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    bindSocketEvents(socket);
  }

  if (!socket.connected) {
    socket.connect();
    return;
  }

  joinBranch(branchId);
};

export const disconnectRealtime = () => {
  currentBranchId = null;
  if (!socket) return;
  socket.disconnect();
  socket = null;
};

export const onRealtimeEvent = (listener: RealtimeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
