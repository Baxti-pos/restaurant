import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware, requireShift, shiftMiddleware } from "../../middlewares/auth.js";
import { branchScopeMiddleware } from "../../middlewares/branchScope.js";
import {
  requireManagerAnyPermissions,
  requireManagerPermissions
} from "../../middlewares/permissions.js";
import { requireRoles } from "../../middlewares/roles.js";
import { guestRequestsController } from "./guest-requests.controller.js";

export const guestRequestsRouter = Router();

guestRequestsRouter.use(
  authMiddleware,
  activeBranchMiddleware,
  branchScopeMiddleware,
  shiftMiddleware,
  requireRoles(["OWNER", "MANAGER", "WAITER"])
);

guestRequestsRouter.get(
  "/overview",
  requireManagerAnyPermissions(["TABLES_VIEW", "TABLES_MANAGE", "ORDERS_VIEW", "ORDERS_MANAGE"]),
  (req, res) => guestRequestsController.listOverview(req, res)
);

guestRequestsRouter.get(
  "/tables/:tableId",
  requireManagerAnyPermissions(["TABLES_VIEW", "TABLES_MANAGE", "ORDERS_VIEW", "ORDERS_MANAGE"]),
  (req, res) => guestRequestsController.getTableInbox(req, res)
);

guestRequestsRouter.post(
  "/orders/:requestId/accept",
  requireManagerPermissions(["ORDERS_MANAGE"]),
  requireShift,
  (req, res) => guestRequestsController.acceptOrderRequest(req, res)
);

guestRequestsRouter.post(
  "/orders/:requestId/reject",
  requireManagerPermissions(["ORDERS_MANAGE"]),
  requireShift,
  (req, res) => guestRequestsController.rejectOrderRequest(req, res)
);

guestRequestsRouter.post(
  "/service-requests/:requestId/acknowledge",
  requireManagerPermissions(["ORDERS_MANAGE"]),
  requireShift,
  (req, res) => guestRequestsController.acknowledgeServiceRequest(req, res)
);

guestRequestsRouter.post(
  "/service-requests/:requestId/complete",
  requireManagerPermissions(["ORDERS_MANAGE"]),
  requireShift,
  (req, res) => guestRequestsController.completeServiceRequest(req, res)
);
