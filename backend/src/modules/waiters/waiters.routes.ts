import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import { requirePermissions } from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { waitersController } from "./waiters.controller.js";
import { commissionsController } from "./commissions.controller.js";

export const waitersRouter = Router();

waitersRouter.use(
  authMiddleware,
  requireRoles(["OWNER", "MANAGER"]),
  activeBranchMiddleware,
  branchScopeMiddleware
);

// Shift routes
waitersRouter.get("/:waiterId/shifts", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  waitersController.getShifts(req, res)
);
waitersRouter.post("/:waiterId/shifts/open", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.openShift(req, res)
);
waitersRouter.post("/:waiterId/shifts/close", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.closeShift(req, res)
);

// Commission routes
waitersRouter.get("/:waiterId/commission-summary", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  commissionsController.getSummary(req, res)
);
waitersRouter.post("/:waiterId/payouts", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  commissionsController.addPayout(req, res)
);

waitersRouter.get("/", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  waitersController.list(req, res)
);
waitersRouter.get("/:waiterId", requirePermissions(["WAITERS_VIEW"]), (req, res) =>
  waitersController.getById(req, res)
);
waitersRouter.post("/", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.create(req, res)
);
waitersRouter.patch("/:waiterId", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.update(req, res)
);
waitersRouter.delete("/:waiterId", requirePermissions(["WAITERS_MANAGE"]), (req, res) =>
  waitersController.remove(req, res)
);
