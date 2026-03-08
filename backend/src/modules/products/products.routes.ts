import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import { requirePermissions } from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { productsController } from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  activeBranchMiddleware,
  branchScopeMiddleware
);

productsRouter.get("/", requirePermissions(["PRODUCTS_VIEW"]), (req, res) =>
  productsController.list(req, res)
);
productsRouter.get("/:productId", requirePermissions(["PRODUCTS_VIEW"]), (req, res) =>
  productsController.getById(req, res)
);
productsRouter.post("/", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  productsController.create(req, res)
);
productsRouter.patch("/:productId", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  productsController.update(req, res)
);
productsRouter.delete("/:productId", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  productsController.remove(req, res)
);
