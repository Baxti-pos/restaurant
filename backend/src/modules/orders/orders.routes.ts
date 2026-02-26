import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { ordersController } from "./orders.controller.js";

export const ordersRouter = Router();

ordersRouter.use(authMiddleware, activeBranchMiddleware);

ordersRouter.get("/open", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  ordersController.listOpen(req, res)
);
ordersRouter.get("/:orderId", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  ordersController.getById(req, res)
);

ordersRouter.post("/open-for-table", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  ordersController.openForTable(req, res)
);
ordersRouter.post("/:orderId/items", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  ordersController.addItem(req, res)
);

ordersRouter.patch("/:orderId/items/:itemId", requireRoles(["OWNER"]), (req, res) =>
  ordersController.changeItem(req, res)
);
ordersRouter.delete("/:orderId/items/:itemId", requireRoles(["OWNER"]), (req, res) =>
  ordersController.removeItem(req, res)
);
ordersRouter.post("/:orderId/close", requireRoles(["OWNER"]), (req, res) =>
  ordersController.closeOrder(req, res)
);
