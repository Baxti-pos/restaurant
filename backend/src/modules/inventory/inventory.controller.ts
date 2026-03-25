import type { Request, Response } from 'express';
import { emitToBranch } from '../../socket/index.js';
import { InventoryError, inventoryService } from './inventory.service.js';

const handleError = (res: Response, error: unknown) => {
  if (error instanceof InventoryError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  console.error('Inventory controller xatosi:', error);
  return res.status(500).json({
    message: 'Ichki server xatosi',
  });
};

const getContext = (req: Request) => {
  const ownerId = req.ownerScopeId;
  const branchId = req.activeBranchId;
  const userId = req.auth?.sub;

  if (!ownerId || !branchId) {
    return null;
  }

  return {
    ownerId,
    branchId,
    userId,
  };
};

const emitInventoryUpdated = (
  branchId: string,
  action: string,
  entity: string,
  entityId?: string | null
) => {
  try {
    emitToBranch(branchId, 'inventory.updated', {
      action,
      entity,
      entityId: entityId ?? null,
      branchId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('inventory.updated emit xatosi:', error);
  }
};

export const inventoryController = {
  async dashboard(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.dashboard(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Inventar dashboardi',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async listIngredients(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.listIngredients(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Ingredientlar royxati',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createIngredient(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.createIngredient(ctx.ownerId, ctx.branchId, req.body, {
        userId: ctx.userId,
      });
      emitInventoryUpdated(ctx.branchId, 'created', 'ingredient', data.id);

      return res.status(201).json({
        message: 'Ingredient yaratildi',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async updateIngredient(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.updateIngredient(
        ctx.ownerId,
        ctx.branchId,
        req.params.ingredientId,
        req.body,
        {
          userId: ctx.userId,
        }
      );
      emitInventoryUpdated(ctx.branchId, 'updated', 'ingredient', data.id);

      return res.status(200).json({
        message: 'Ingredient yangilandi',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async listPurchases(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.listPurchases(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Inventar kirimlari',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async createPurchase(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.createPurchase(ctx.ownerId, ctx.branchId, req.body, {
        userId: ctx.userId,
      });
      emitInventoryUpdated(ctx.branchId, 'created', 'purchase', data.id);

      return res.status(201).json({
        message: 'Inventar kirimi yaratildi',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async listMovements(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.listMovements(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Stock movementlar',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async usage(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.usage(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Ingredient sarfi hisoboti',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async listProducts(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.listProducts(
        ctx.ownerId,
        ctx.branchId,
        req.query as Record<string, unknown>
      );

      return res.status(200).json({
        message: 'Retseptli mahsulotlar',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async getProductRecipe(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.getProductRecipe(
        ctx.ownerId,
        ctx.branchId,
        req.params.productId
      );

      return res.status(200).json({
        message: 'Mahsulot retsepti',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  async saveProductRecipe(req: Request, res: Response) {
    try {
      const ctx = getContext(req);
      if (!ctx) {
        return res.status(401).json({ message: 'Autorizatsiya talab qilinadi' });
      }

      const data = await inventoryService.saveProductRecipe(
        ctx.ownerId,
        ctx.branchId,
        req.params.productId,
        req.body
      );
      emitInventoryUpdated(ctx.branchId, 'updated', 'recipe', data.id);

      return res.status(200).json({
        message: 'Retsept saqlandi',
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },
};
