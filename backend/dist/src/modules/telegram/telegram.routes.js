import { Router } from "express";
import { telegramController } from "./telegram.controller.js";
export const telegramRouter = Router();
telegramRouter.post("/tma/auth", (req, res) => telegramController.tmaAuth(req, res));
