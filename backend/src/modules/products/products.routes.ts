import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { productsController } from "./products.controller.js";

export const productsRouter = Router();

productsRouter.use(authMiddleware, requireRoles(["OWNER"]), activeBranchMiddleware);

productsRouter.get("/", (req, res) => productsController.list(req, res));
productsRouter.get("/:productId", (req, res) => productsController.getById(req, res));
productsRouter.post("/", (req, res) => productsController.create(req, res));
productsRouter.patch("/:productId", (req, res) => productsController.update(req, res));
productsRouter.delete("/:productId", (req, res) => productsController.remove(req, res));
