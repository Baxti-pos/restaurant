import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { requireRoles } from "../../middlewares/roles.js";
import { printService } from "./print.service.js";
import { prisma } from "../../prisma.js";

export const printRouter = Router();

printRouter.use(authMiddleware);

// POST /print/receipt
printRouter.post(
  "/receipt",
  requireRoles(["OWNER", "MANAGER", "WAITER"]),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const branchId = user?.branchId ?? req.body.branchId;

      const branch = branchId
        ? await prisma.branch.findUnique({
            where: { id: branchId },
            select: { printerIp: true, printerPort: true }
          })
        : null;

      const printerIp   = branch?.printerIp ?? req.body.printerIp;
      const printerPort = branch?.printerPort ?? req.body.printerPort ?? 9100;

      if (!printerIp) {
        res.status(400).json({ error: "Printer IP sozlanmagan. Filial sozlamalarini tekshiring." });
        return;
      }

      await printService.printReceipt({ ...req.body, printerIp, printerPort });
      res.json({ ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PRINT]", msg);
      res.status(500).json({ error: msg });
    }
  }
);
