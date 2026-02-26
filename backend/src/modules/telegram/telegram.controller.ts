import type { Request, Response } from "express";
import { TelegramAuthError, telegramService } from "./telegram.service.js";

const handleError = (res: Response, error: unknown) => {
  if (error instanceof TelegramAuthError) {
    return res.status(error.statusCode).json({
      message: error.message
    });
  }

  console.error("Telegram controller xatosi:", error);
  return res.status(500).json({
    message: "Ichki server xatosi"
  });
};

export const telegramController = {
  async tmaAuth(req: Request, res: Response) {
    try {
      const result = await telegramService.tmaAuth({
        initData: req.body?.initData
      });

      return res.status(200).json({
        message: "Telegram orqali autentifikatsiya muvaffaqiyatli",
        data: result
      });
    } catch (error) {
      return handleError(res, error);
    }
  }
};
