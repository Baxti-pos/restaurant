import { prisma } from "../../prisma.js";
import { ExpensesError } from "./expenses.service.js";

const ensureOwnedActiveBranch = async (ownerId: string, branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ownerId,
      isActive: true
    },
    select: { id: true }
  });

  if (!branch) {
    throw new ExpensesError(404, "Faol filial topilmadi");
  }
};

export const expenseCategoriesService = {
  async list(ownerId: string, branchId: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    return (prisma as any).expenseCategory.findMany({
      where: { branchId },
      orderBy: { name: "asc" }
    });
  },

  async create(ownerId: string, branchId: string, name: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!name || !name.trim()) {
      throw new ExpensesError(400, "Nomi kiritilishi shart");
    }

    const trimmedName = name.trim();

    // Check if category with this name already exists in this branch
    const existing = await (prisma as any).expenseCategory.findUnique({
      where: {
        branchId_name: {
          branchId,
          name: trimmedName
        }
      }
    });

    if (existing) {
      throw new ExpensesError(400, "Bunday nomli xarajat turi allaqachon mavjud");
    }

    return (prisma as any).expenseCategory.create({
      data: {
        branchId,
        name: trimmedName
      }
    });
  },

  async update(ownerId: string, branchId: string, id: string, name: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    if (!name || !name.trim()) {
      throw new ExpensesError(400, "Nomi kiritilishi shart");
    }

    const trimmedName = name.trim();

    const category = await (prisma as any).expenseCategory.findFirst({
      where: { id, branchId }
    });

    if (!category) {
      throw new ExpensesError(404, "Xarajat turi topilmadi");
    }

    return (prisma as any).expenseCategory.update({
      where: { id },
      data: { name: trimmedName }
    });
  },

  async remove(ownerId: string, branchId: string, id: string) {
    await ensureOwnedActiveBranch(ownerId, branchId);

    const category = await (prisma as any).expenseCategory.findFirst({
      where: { id, branchId },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    });

    if (!category) {
      throw new ExpensesError(404, "Xarajat turi topilmadi");
    }

    if (category._count.expenses > 0) {
      throw new ExpensesError(400, "Ushbu turdagi xarajatlar mavjud, uni o'chirib bo'lmaydi");
    }

    return (prisma as any).expenseCategory.delete({
      where: { id }
    });
  }
};
