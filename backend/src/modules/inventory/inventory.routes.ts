import { Router } from 'express';
import { activeBranchMiddleware } from '../../middlewares/activeBranch.js';
import { authMiddleware } from '../../middlewares/auth.js';
import { branchScopeMiddleware } from '../../middlewares/branchScope.js';
import {
  requireManagerAnyPermissions,
  requirePermissions,
} from '../../middlewares/permissions.js';
import { requireRoles } from '../../middlewares/roles.js';
import { inventoryController } from './inventory.controller.js';

export const inventoryRouter = Router();

inventoryRouter.use(
  authMiddleware,
  requireRoles(['OWNER', 'MANAGER']),
  activeBranchMiddleware,
  branchScopeMiddleware
);

inventoryRouter.get(
  '/dashboard',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.dashboard(req, res)
);
inventoryRouter.get(
  '/ingredients',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.listIngredients(req, res)
);
inventoryRouter.post('/ingredients', requirePermissions(['INVENTORY_MANAGE']), (req, res) =>
  inventoryController.createIngredient(req, res)
);
inventoryRouter.patch('/ingredients/:ingredientId', requirePermissions(['INVENTORY_MANAGE']), (req, res) =>
  inventoryController.updateIngredient(req, res)
);

inventoryRouter.get(
  '/purchases',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.listPurchases(req, res)
);
inventoryRouter.post('/purchases', requirePermissions(['INVENTORY_MANAGE']), (req, res) =>
  inventoryController.createPurchase(req, res)
);

inventoryRouter.get(
  '/movements',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.listMovements(req, res)
);
inventoryRouter.get(
  '/usage',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.usage(req, res)
);

inventoryRouter.get(
  '/products',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.listProducts(req, res)
);
inventoryRouter.get(
  '/products/:productId/recipe',
  requireManagerAnyPermissions(['INVENTORY_VIEW', 'INVENTORY_MANAGE']),
  (req, res) => inventoryController.getProductRecipe(req, res)
);
inventoryRouter.put('/products/:productId/recipe', requirePermissions(['INVENTORY_MANAGE']), (req, res) =>
  inventoryController.saveProductRecipe(req, res)
);
