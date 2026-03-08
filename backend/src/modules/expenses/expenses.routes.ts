import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import { requireAnyPermissions, requirePermissions } from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { expensesController } from "./expenses.controller.js";

export const expensesRouter = Router();

expensesRouter.use(
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  activeBranchMiddleware,
  branchScopeMiddleware
);

expensesRouter.get(
  "/",
  requireAnyPermissions(["EXPENSES_VIEW", "DASHBOARD_VIEW", "REPORTS_VIEW"]),
  (req, res) =>
  expensesController.list(req, res)
);
expensesRouter.get(
  "/:expenseId",
  requireAnyPermissions(["EXPENSES_VIEW", "DASHBOARD_VIEW", "REPORTS_VIEW"]),
  (req, res) => expensesController.getById(req, res)
);
expensesRouter.post("/", requirePermissions(["EXPENSES_MANAGE"]), (req, res) =>
  expensesController.create(req, res)
);
expensesRouter.patch("/:expenseId", requirePermissions(["EXPENSES_MANAGE"]), (req, res) =>
  expensesController.update(req, res)
);
expensesRouter.delete("/:expenseId", requirePermissions(["EXPENSES_MANAGE"]), (req, res) =>
  expensesController.remove(req, res)
);
