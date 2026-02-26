import { Router } from "express";
import { activeBranchMiddleware } from "../../middlewares/activeBranch.js";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { expensesController } from "./expenses.controller.js";

export const expensesRouter = Router();

expensesRouter.use(authMiddleware, requireRoles(["OWNER"]), activeBranchMiddleware);

expensesRouter.get("/", (req, res) => expensesController.list(req, res));
expensesRouter.get("/:expenseId", (req, res) => expensesController.getById(req, res));
expensesRouter.post("/", (req, res) => expensesController.create(req, res));
expensesRouter.patch("/:expenseId", (req, res) => expensesController.update(req, res));
expensesRouter.delete("/:expenseId", (req, res) => expensesController.remove(req, res));
