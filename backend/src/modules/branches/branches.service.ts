import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";

export class BranchesError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "BranchesError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseStringRequired = (value: unknown, fieldLabel: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new BranchesError(400, `${fieldLabel} kiritilishi shart`);
  }

  return value.trim();
};

const parseOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new BranchesError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseOptionalBoolean = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new BranchesError(400, "Boolean qiymat yaroqsiz");
  }

  return value;
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new BranchesError(409, "Bunday filial nomi allaqachon mavjud");
    }
  }

  return error;
};

const ensureOwnedBranch = async (ownerId: string, branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      ownerId
    }
  });

  if (!branch) {
    throw new BranchesError(404, "Filial topilmadi");
  }

  return branch;
};

export const branchesService = {
  async list(ownerId: string) {
    return prisma.branch.findMany({
      where: { ownerId },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  async getById(ownerId: string, branchIdRaw: unknown) {
    const branchId = parseStringRequired(branchIdRaw, "Filial ID");

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        ownerId
      },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            staff: true,
            tables: true,
            categories: true,
            products: true
          }
        }
      }
    });

    if (!branch) {
      throw new BranchesError(404, "Filial topilmadi");
    }

    return branch;
  },

  async create(ownerId: string, payload: unknown) {
    if (!isObject(payload)) {
      throw new BranchesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const name = parseStringRequired(payload.name, "Filial nomi");
    const address = parseOptionalString(payload.address);
    const isActive = parseOptionalBoolean(payload.isActive);

    try {
      const branch = await prisma.branch.create({
        data: {
          ownerId,
          name,
          address: address ?? null,
          ...(isActive !== undefined ? { isActive } : {})
        },
        select: {
          id: true,
          name: true,
          address: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return branch;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, branchIdRaw: unknown, payload: unknown) {
    if (!isObject(payload)) {
      throw new BranchesError(400, "So'rov ma'lumoti yaroqsiz");
    }

    const branchId = parseStringRequired(branchIdRaw, "Filial ID");
    await ensureOwnedBranch(ownerId, branchId);

    const data: Prisma.BranchUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "name")) {
      data.name = parseStringRequired(payload.name, "Filial nomi");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "address")) {
      data.address = parseOptionalString(payload.address) ?? null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
      const isActive = parseOptionalBoolean(payload.isActive);
      if (isActive !== undefined) {
        data.isActive = isActive;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new BranchesError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    try {
      const branch = await prisma.branch.update({
        where: { id: branchId },
        data,
        select: {
          id: true,
          name: true,
          address: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return branch;
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, branchIdRaw: unknown) {
    const branchId = parseStringRequired(branchIdRaw, "Filial ID");
    await ensureOwnedBranch(ownerId, branchId);

    const branch = await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false },
      select: {
        id: true,
        name: true,
        address: true,
        isActive: true,
        updatedAt: true
      }
    });

    return branch;
  }
};
