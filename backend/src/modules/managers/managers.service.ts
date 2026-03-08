import { Prisma, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { APP_PERMISSIONS, PREDEFINED_PERMISSIONS, isValidPermission } from "../../constants/permissions.js";
import { prisma } from "../../prisma.js";

export class ManagersError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ManagersError";
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseRequiredString = (value: unknown, label: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ManagersError(400, `${label} kiritilishi shart`);
  }

  return value.trim();
};

const normalizeUzPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("998") ? digits.slice(3) : digits;
  return `+998${local.slice(0, 9)}`;
};

const parseRequiredPhoneField = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new ManagersError(400, "Telefon raqam kiritilishi shart");
  }

  const normalized = normalizeUzPhone(value);
  if (!/^\+998\d{9}$/.test(normalized)) {
    throw new ManagersError(400, "Telefon raqam +998XXXXXXXXX formatida bolishi kerak");
  }

  return normalized;
};

const parseBooleanField = (value: unknown, label: string) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ManagersError(400, `${label} yaroqsiz`);
  }

  return value;
};

const parsePermissions = (value: unknown, options?: { required?: boolean }) => {
  const required = options?.required ?? false;
  if (value === undefined) {
    if (required) {
      throw new ManagersError(400, "Permissions kiritilishi shart");
    }
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ManagersError(400, "Permissions royxat korinishida bolishi kerak");
  }

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!isValidPermission(item)) {
      throw new ManagersError(400, "Permissions ichida yaroqsiz qiymat bor");
    }

    if (seen.has(item)) {
      continue;
    }

    seen.add(item);
    unique.push(item);
  }

  if (required && unique.length === 0) {
    throw new ManagersError(400, "Kamida bitta permission tanlanishi kerak");
  }

  return unique;
};

const parseBranchIds = (value: unknown, options?: { required?: boolean }) => {
  const required = options?.required ?? false;
  if (value === undefined) {
    if (required) {
      throw new ManagersError(400, "Filiallar royxati kiritilishi shart");
    }
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new ManagersError(400, "Filiallar royxat korinishida bolishi kerak");
  }

  const unique: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string" || !item.trim()) {
      throw new ManagersError(400, "Filial ID yaroqsiz");
    }

    const id = item.trim();
    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    unique.push(id);
  }

  if (required && unique.length === 0) {
    throw new ManagersError(400, "Kamida bitta filial tanlanishi kerak");
  }

  return unique;
};

const parsePassword = (value: unknown, options?: { required?: boolean }) => {
  const required = options?.required ?? false;

  if (value === undefined) {
    if (required) {
      throw new ManagersError(400, "Parol kiritilishi shart");
    }
    return undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw new ManagersError(400, "Parol kiritilishi shart");
  }

  const trimmed = value.trim();
  if (trimmed.length < 4) {
    throw new ManagersError(400, "Parol kamida 4 ta belgidan iborat bolishi kerak");
  }

  return trimmed;
};

const ensureOwnerBranches = async (ownerId: string, branchIds: string[]) => {
  const branches = await prisma.branch.findMany({
    where: {
      id: { in: branchIds },
      ownerId,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      address: true,
      isActive: true
    }
  });

  if (branches.length !== branchIds.length) {
    throw new ManagersError(404, "Tanlangan filiallardan biri topilmadi yoki sizga tegishli emas");
  }

  const branchMap = new Map(branches.map((branch) => [branch.id, branch]));
  return branchIds.map((branchId) => branchMap.get(branchId)!);
};

const managerSelect = {
  id: true,
  fullName: true,
  phone: true,
  permissions: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  managerBranches: {
    where: {
      isActive: true,
      branch: {
        isActive: true
      }
    },
    select: {
      branch: {
        select: {
          id: true,
          name: true,
          address: true,
          isActive: true
        }
      }
    }
  }
} as const;

const serializeManager = (manager: Prisma.UserGetPayload<{ select: typeof managerSelect }>) => ({
  id: manager.id,
  fullName: manager.fullName,
  phone: manager.phone,
  permissions: manager.permissions.filter(isValidPermission),
  role: manager.role,
  isActive: manager.isActive,
  branches: manager.managerBranches.map((assignment) => assignment.branch),
  createdAt: manager.createdAt,
  updatedAt: manager.updatedAt
});

const ensureManagerBelongsToOwner = async (ownerId: string, managerId: string) => {
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      role: UserRole.MANAGER,
      managerBranches: {
        some: {
          isActive: true,
          branch: {
            ownerId,
            isActive: true
          }
        }
      }
    },
    select: {
      id: true
    }
  });

  if (!manager) {
    throw new ManagersError(404, "Manager topilmadi");
  }
};

const mapPrismaError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return new ManagersError(409, "Telefon raqam allaqachon ishlatilgan");
  }

  return error;
};

export const managersService = {
  permissions() {
    return {
      permissions: APP_PERMISSIONS,
      predefined: PREDEFINED_PERMISSIONS
    };
  },

  async list(ownerId: string) {
    const managers = await prisma.user.findMany({
      where: {
        role: UserRole.MANAGER,
        managerBranches: {
          some: {
            isActive: true,
            branch: {
              ownerId,
              isActive: true
            }
          }
        }
      },
      orderBy: [{ createdAt: "asc" }],
      select: managerSelect
    });

    return managers.map(serializeManager);
  },

  async getById(ownerId: string, managerIdRaw: unknown) {
    const managerId = parseRequiredString(managerIdRaw, "Manager ID");
    await ensureManagerBelongsToOwner(ownerId, managerId);

    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        role: UserRole.MANAGER
      },
      select: managerSelect
    });

    if (!manager) {
      throw new ManagersError(404, "Manager topilmadi");
    }

    return serializeManager(manager);
  },

  async create(ownerId: string, payload: unknown) {
    if (!isObject(payload)) {
      throw new ManagersError(400, "Sorov malumoti yaroqsiz");
    }

    const fullName = parseRequiredString(payload.fullName, "F.I.Sh");
    const phone = parseRequiredPhoneField(payload.phone);
    const password = parsePassword(payload.password, { required: true })!;
    const permissions = parsePermissions(payload.permissions, { required: true })!;
    const branchIds = parseBranchIds(payload.branchIds, { required: true })!;
    const isActive = parseBooleanField(payload.isActive, "isActive") ?? true;

    const branches = await ensureOwnerBranches(ownerId, branchIds);
    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const manager = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            fullName,
            phone,
            passwordHash,
            permissions,
            role: UserRole.MANAGER,
            isActive
          },
          select: {
            id: true
          }
        });

        await tx.managerBranch.createMany({
          data: branches.map((branch) => ({
            managerId: created.id,
            branchId: branch.id,
            isActive: true
          }))
        });

        return tx.user.findUnique({
          where: {
            id: created.id
          },
          select: managerSelect
        });
      });

      if (!manager) {
        throw new ManagersError(500, "Manager yaratishda xatolik");
      }

      return serializeManager(manager);
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async update(ownerId: string, managerIdRaw: unknown, payload: unknown) {
    if (!isObject(payload)) {
      throw new ManagersError(400, "Sorov malumoti yaroqsiz");
    }

    const managerId = parseRequiredString(managerIdRaw, "Manager ID");
    await ensureManagerBelongsToOwner(ownerId, managerId);

    const hasAnyField = [
      "fullName",
      "phone",
      "password",
      "permissions",
      "branchIds",
      "isActive"
    ].some((key) => Object.prototype.hasOwnProperty.call(payload, key));

    if (!hasAnyField) {
      throw new ManagersError(400, "Yangilash uchun kamida bitta maydon yuboring");
    }

    const data: Prisma.UserUpdateInput = {};

    if (Object.prototype.hasOwnProperty.call(payload, "fullName")) {
      data.fullName = parseRequiredString(payload.fullName, "F.I.Sh");
    }

    if (Object.prototype.hasOwnProperty.call(payload, "phone")) {
      data.phone = parseRequiredPhoneField(payload.phone);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "permissions")) {
      data.permissions = parsePermissions(payload.permissions, { required: true });
    }

    if (Object.prototype.hasOwnProperty.call(payload, "isActive")) {
      const isActive = parseBooleanField(payload.isActive, "isActive");
      if (isActive === undefined) {
        throw new ManagersError(400, "isActive yaroqsiz");
      }
      data.isActive = isActive;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "password")) {
      const password = parsePassword(payload.password);
      if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
      }
    }

    const hasBranchIds = Object.prototype.hasOwnProperty.call(payload, "branchIds");
    const branchIds = hasBranchIds
      ? parseBranchIds(payload.branchIds, { required: true })!
      : undefined;

    const branches = branchIds ? await ensureOwnerBranches(ownerId, branchIds) : undefined;

    try {
      const manager = await prisma.$transaction(async (tx) => {
        if (Object.keys(data).length > 0) {
          await tx.user.update({
            where: { id: managerId },
            data
          });
        }

        if (branches) {
          const ownerBranchIds = await tx.branch.findMany({
            where: {
              ownerId
            },
            select: {
              id: true
            }
          });

          await tx.managerBranch.deleteMany({
            where: {
              managerId,
              branchId: {
                in: ownerBranchIds.map((branch) => branch.id)
              }
            }
          });

          await tx.managerBranch.createMany({
            data: branches.map((branch) => ({
              managerId,
              branchId: branch.id,
              isActive: true
            }))
          });
        }

        return tx.user.findUnique({
          where: {
            id: managerId
          },
          select: managerSelect
        });
      });

      if (!manager) {
        throw new ManagersError(404, "Manager topilmadi");
      }

      return serializeManager(manager);
    } catch (error) {
      throw mapPrismaError(error);
    }
  },

  async remove(ownerId: string, managerIdRaw: unknown) {
    const managerId = parseRequiredString(managerIdRaw, "Manager ID");
    await ensureManagerBelongsToOwner(ownerId, managerId);

    await prisma.user.delete({
      where: {
        id: managerId
      }
    });

    return {
      id: managerId
    };
  }
};
