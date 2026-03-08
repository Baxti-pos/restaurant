import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { managersController } from "./managers.controller.js";

export const managersRouter = Router();

managersRouter.use(authMiddleware, requireRoles(["OWNER"]));

managersRouter.get("/permissions", (req, res) => managersController.permissions(req, res));
managersRouter.get("/", (req, res) => managersController.list(req, res));
managersRouter.get("/:managerId", (req, res) => managersController.getById(req, res));
managersRouter.post("/", (req, res) => managersController.create(req, res));
managersRouter.patch("/:managerId", (req, res) => managersController.update(req, res));
managersRouter.delete("/:managerId", (req, res) => managersController.remove(req, res));
