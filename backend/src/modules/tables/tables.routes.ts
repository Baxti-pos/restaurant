import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { tablesController } from "./tables.controller.js";

export const tablesRouter = Router();

tablesRouter.use(authMiddleware, activeBranchMiddleware);

tablesRouter.get("/", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  tablesController.list(req, res)
);
tablesRouter.get("/:tableId", requireRoles(["OWNER", "WAITER"]), (req, res) =>
  tablesController.getById(req, res)
);
tablesRouter.post("/", requireRoles(["OWNER"]), (req, res) =>
  tablesController.create(req, res)
);
tablesRouter.patch("/:tableId", requireRoles(["OWNER"]), (req, res) =>
  tablesController.update(req, res)
);
tablesRouter.delete("/:tableId", requireRoles(["OWNER"]), (req, res) =>
  tablesController.remove(req, res)
);
