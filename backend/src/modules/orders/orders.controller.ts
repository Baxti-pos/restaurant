import type { Request, Response } from 'express';
import { emitToBranch } from '../../socket/index.js';
import { InventoryError } from '../inventory/inventory.service.js';
import { OrdersError, ordersService } from './orders.service.js';

const handleError = (res: Response, error: unknown) => {
  if (error instanceof OrdersError || error instanceof InventoryError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error('Orders controller xatosi:', error);
  return res.status(500).json({
    message: 'Ichki server xatosi'
  });
};

const emitSafe = (branchId: string, event: string, payload: unknown) => {
  try {
    emitToBranch(branchId, event, payload);
  } catch (error) {
    console.error(`${event} emit xatosi:`, error);
  }
};

const emitTablesUpdated = (branchId: string, action: string, tableId: string) => {
  emitSafe(branchId, 'tables.updated', {
    action,
    tableId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const emitOrderUpdated = (branchId: string, action: string, orderId: string) => {
  emitSafe(branchId, 'order.updated', {
    action,
    orderId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const emitOrderClosed = (branchId: string, orderId: string) => {
  emitSafe(branchId, 'order.closed', {
    orderId,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const emitInventoryUpdated = (
  branchId: string,
  action: string,
  entity: string,
  entityId?: string | null
) => {
  emitSafe(branchId, 'inventory.updated', {
    action,
    entity,
    entityId: entityId ?? null,
    branchId,
    timestamp: new Date().toISOString()
  });
};

const getContext = (req: Request) => {
  if (!req.auth || !req.activeBranchId) {
    return null;
  }

  return {
    actor: {
      userId: req.auth.sub,
      role: req.auth.role,
      shiftId: req.shiftId
    },
    branchId: req.activeBranchId
  };
};

export const ordersController = {
  async list(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await ordersService.list(ctx.branchId, req.query as Record<string, unknown>);
      return res.status(200).json({
        message: "Buyurtmalar ro'yxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async listOpen(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await ordersService.listOpen(ctx.branchId);
      return res.status(200).json({
        message: "Ochiq buyurtmalar ro'yxati",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await ordersService.getById(ctx.branchId, req.params.orderId);
      return res.status(200).json({
        message: "Buyurtma ma'lumoti",
        data
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async openForTable(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.openForTable({
        branchId: ctx.branchId,
        actor: ctx.actor,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, result.created ? 'opened' : 'opened_existing', result.order.id);

      if (result.tableStatusChanged) {
        emitTablesUpdated(ctx.branchId, 'occupied', result.table.id);
      }

      return res.status(result.created ? 201 : 200).json({
        message: result.created
          ? 'Stol uchun buyurtma ochildi'
          : 'Stolda mavjud ochiq buyurtma qaytarildi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async openAndCreate(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.openAndCreate({
        branchId: ctx.branchId,
        actor: ctx.actor,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, result.created ? 'opened' : 'items_added', result.order.id);
      if (result.tableStatusChanged) {
        emitTablesUpdated(ctx.branchId, 'occupied', result.table.id);
      }

      return res.status(result.created ? 201 : 200).json({
        message: result.created ? 'Stol uchun buyurtma ochildi va itemlar qoshildi' : 'Mavjud buyurtmaga itemlar qoshildi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async openAndCreateTakeout(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.openAndCreateTakeout({
        branchId: ctx.branchId,
        actor: ctx.actor,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, 'takeout_opened', result.order.id);

      return res.status(201).json({
        message: 'Olib ketish buyurtma yaratildi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async syncItems(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const canEditItems =
        req.auth?.role === 'OWNER' ||
        (req.auth?.role === 'MANAGER' &&
          Array.isArray(req.auth?.permissions) &&
          req.auth.permissions.includes('ORDERS_EDIT'));

      const result = await ordersService.syncItems({
        branchId: ctx.branchId,
        actor: ctx.actor,
        orderIdRaw: req.params.orderId,
        payload: req.body,
        canEditItems
      });

      if (result.deleted) {
        emitOrderUpdated(ctx.branchId, 'deleted_empty', result.orderId);
        if (result.table?.id) {
          emitTablesUpdated(ctx.branchId, 'available', result.table.id);
        }

        return res.status(200).json({
          message: "Buyurtma bo'sh qolgani uchun bekor qilindi",
          data: result
        });
      }

      if (!result.order) {
        throw new OrdersError(500, "Buyurtma ma'lumoti topilmadi");
      }

      const order = result.order;
      emitOrderUpdated(ctx.branchId, 'items_synced', order.id);
      if (order.tableId) {
        emitTablesUpdated(ctx.branchId, 'items_synced', order.tableId);
      }

      return res.status(200).json({
        message: 'Buyurtma itemlari yangilandi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.addItem({
        branchId: ctx.branchId,
        actor: ctx.actor,
        orderIdRaw: req.params.orderId,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, 'item_added', result.order.id);

      return res.status(200).json({
        message: "Item buyurtmaga qo'shildi",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async changeItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.changeItem({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        itemIdRaw: req.params.itemId,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, 'item_changed', result.order.id);

      return res.status(200).json({
        message: 'Item yangilandi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async removeItem(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.removeItem({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        itemIdRaw: req.params.itemId
      });

      emitOrderUpdated(ctx.branchId, 'item_removed', result.order.id);

      return res.status(200).json({
        message: 'Item buyurtmadan olib tashlandi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async updateFulfillmentStatus(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.updateFulfillmentStatus({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        itemIdRaw: req.params.itemId,
        payload: req.body
      });

      emitOrderUpdated(ctx.branchId, 'item_fulfillment_changed', result.order.id);
      if (result.order.tableId) {
        emitTablesUpdated(ctx.branchId, 'item_fulfillment_changed', result.order.tableId);
      }

      return res.status(200).json({
        message: 'Item holati yangilandi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async closeOrder(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const result = await ordersService.closeOrder({
        branchId: ctx.branchId,
        orderIdRaw: req.params.orderId,
        payload: req.body,
        actor: ctx.actor
      });

      emitOrderClosed(ctx.branchId, result.order.id);

      if (result.tableStatusChanged && result.table) {
        emitTablesUpdated(ctx.branchId, 'available', result.table.id);
      }

      if (result.inventoryChanged) {
        emitInventoryUpdated(ctx.branchId, 'deducted', 'order', result.order.id);
      }

      return res.status(200).json({
        message: 'Buyurtma yopildi',
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
