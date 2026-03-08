import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import { requirePermissions } from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { categoriesController } from "./categories.controller.js";

export const categoriesRouter = Router();

categoriesRouter.use(
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  activeBranchMiddleware,
  branchScopeMiddleware
);

categoriesRouter.get("/", requirePermissions(["PRODUCTS_VIEW"]), (req, res) =>
  categoriesController.list(req, res)
);
categoriesRouter.get("/:categoryId", requirePermissions(["PRODUCTS_VIEW"]), (req, res) =>
  categoriesController.getById(req, res)
);
categoriesRouter.post("/", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  categoriesController.create(req, res)
);
categoriesRouter.patch("/:categoryId", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  categoriesController.update(req, res)
);
categoriesRouter.delete("/:categoryId", requirePermissions(["PRODUCTS_MANAGE"]), (req, res) =>
  categoriesController.remove(req, res)
);
