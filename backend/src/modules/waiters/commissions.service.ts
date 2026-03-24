import { prisma } from "../../prisma.js";
import { WaitersError, ensureOwnedActiveBranch } from "./waiters.service.js";

export const commissionsService = {
  async getSummary(ownerId: string, branchId: string, waiterId: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const waiter = await prisma.user.findFirst({
      where: { id: waiterId, branchId, role: "WAITER" },
      select: { salesSharePercent: true }
    });

    if (!waiter) {
      throw new WaitersError(404, "Girgitton topilmadi");
    }

    const sharePercent = Number(waiter.salesSharePercent);

    // Calculate total earned
    const aggregated = await prisma.order.aggregate({
      where: { branchId, waiterId, status: "CLOSED" },
      _sum: { totalAmount: true }
    });

    const totalEarned = (Number(aggregated._sum.totalAmount || 0) * sharePercent) / 100;

    // Calculate total paid
    const payouts = await (prisma as any).commissionPayout.findMany({
      where: { branchId, waiterId },
      orderBy: { paidAt: "desc" }
    });

    const totalPaid = payouts.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

    return {
      waiterId,
      salesSharePercent: sharePercent,
      totalEarned: Number(totalEarned.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      balance: Number((totalEarned - totalPaid).toFixed(2)),
      payouts: payouts.map((p: any) => ({
        ...p,
        amount: Number(p.amount)
      }))
    };
  },

  async addPayout(ownerId: string, branchId: string, waiterId: string, amount: number, note?: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const waiter = await prisma.user.findFirst({
      where: { id: waiterId, branchId, role: "WAITER" },
      select: { id: true }
    });

    if (!waiter) {
      throw new WaitersError(404, "Girgitton topilmadi");
    }

    const payout = await (prisma as any).commissionPayout.create({
      data: {
        branchId,
        waiterId,
        amount,
        note
      }
    });

    return {
      ...payout,
      amount: Number(payout.amount)
    };
  }
};
