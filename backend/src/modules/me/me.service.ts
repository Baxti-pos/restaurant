import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { OrdersError, ordersService } from "../orders/orders.service.js";
import { TablesError, tablesService } from "../tables/tables.service.js";

export class MeError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = "MeError";
  }
}

const mapExternalError = (error: unknown) => {
  if (error instanceof MeError) {
    return error;
  }

  if (error instanceof OrdersError || error instanceof TablesError) {
    return new MeError(error.statusCode, error.message);
  }

  return error;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseOptionalString = (value: unknown) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new MeError(400, "Matn qiymati yaroqsiz");
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseDecimalField = (
  value: unknown,
  label: string,
  options?: { required?: boolean; nullable?: boolean }
) => {
  const required = options?.required ?? false;
  const nullable = options?.nullable ?? false;

  if (value === undefined) {
    if (required) {
      throw new MeError(400, `${label} kiritilishi shart`);
    }
    return undefined;
  }

  if (value === null) {
    if (nullable) {
      return null;
    }
    throw new MeError(400, `${label} yaroqsiz`);
  }

  let normalized: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new MeError(400, `${label} yaroqsiz`);
    }
    normalized = String(value);
  } else if (typeof value === "string") {
    normalized = value.trim();
    if (!normalized) {
      if (nullable) {
        return null;
      }
      throw new MeError(400, `${label} yaroqsiz`);
    }
  } else {
    throw new MeError(400, `${label} yaroqsiz`);
  }

  let decimal: Prisma.Decimal;
  try {
    decimal = new Prisma.Decimal(normalized);
  } catch {
    throw new MeError(400, `${label} yaroqsiz`);
  }

  if (decimal.lessThan(0)) {
    throw new MeError(400, `${label} manfiy bo'lishi mumkin emas`);
  }

  return decimal;
};

const shiftSelect = {
  id: true,
  branchId: true,
  waiterId: true,
  openedById: true,
  closedById: true,
  status: true,
  openedAt: true,
  closedAt: true,
  openingNote: true,
  closingNote: true,
  startingCash: true,
  endingCash: true,
  createdAt: true,
  updatedAt: true
} as const;

const ensureWaiterInBranch = async (waiterId: string, branchId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: waiterId,
      branchId,
      role: "WAITER",
      isActive: true
    },
    select: {
      id: true,
      fullName: true,
      branchId: true
    }
  });

  if (!user) {
    throw new MeError(403, "Waiter ushbu filialga biriktirilmagan yoki faol emas");
  }

  return user;
};

const getBranchShiftConfig = async (branchId: string) => {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      isActive: true
    },
    select: {
      id: true,
      name: true,
      shiftEnd: true
    }
  });

  if (!branch) {
    throw new MeError(404, "Faol filial topilmadi");
  }

  return branch;
};

const parseShiftEndTime = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute, text: trimmed };
};

const computeAutoStopDeadline = (openedAt: Date, shiftEnd: { hour: number; minute: number }) => {
  const deadline = new Date(openedAt);
  deadline.setHours(shiftEnd.hour, shiftEnd.minute, 0, 0);

  if (openedAt.getTime() >= deadline.getTime()) {
    deadline.setDate(deadline.getDate() + 1);
  }

  return deadline;
};

const computeTodayShiftEnd = (now: Date, shiftEnd: { hour: number; minute: number }) => {
  const cutoff = new Date(now);
  cutoff.setHours(shiftEnd.hour, shiftEnd.minute, 0, 0);
  return cutoff;
};

type ShiftAutoState = {
  branch: {
    id: string;
    name: string;
    shiftEnd: string | null;
  };
  currentShift: {
    id: string;
    branchId: string;
    waiterId: string;
    openedById: string | null;
    closedById: string | null;
    status: "OPEN" | "CLOSED";
    openedAt: Date;
    closedAt: Date | null;
    openingNote: string | null;
    closingNote: string | null;
    startingCash: Prisma.Decimal;
    endingCash: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  autoStopped: boolean;
  autoStoppedAt: string | null;
  lastAutoStoppedShift: {
    id: string;
    branchId: string;
    waiterId: string;
    openedById: string | null;
    closedById: string | null;
    status: "OPEN" | "CLOSED";
    openedAt: Date;
    closedAt: Date | null;
    openingNote: string | null;
    closingNote: string | null;
    startingCash: Prisma.Decimal;
    endingCash: Prisma.Decimal | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
};

const resolveShiftAutoState = async (
  branchId: string,
  waiterId: string
): Promise<ShiftAutoState> => {
  const [branch, openShift] = await Promise.all([
    getBranchShiftConfig(branchId),
    prisma.waiterShift.findFirst({
      where: {
        branchId,
        waiterId,
        status: "OPEN"
      },
      orderBy: [{ openedAt: "desc" }],
      select: shiftSelect
    })
  ]);

  const shiftEnd = parseShiftEndTime(branch.shiftEnd);
  if (!openShift || !shiftEnd) {
    return {
      branch,
      currentShift: openShift,
      autoStopped: false,
      autoStoppedAt: null,
      lastAutoStoppedShift: null
    };
  }

  const deadline = computeAutoStopDeadline(openShift.openedAt, shiftEnd);
  const now = new Date();

  if (now.getTime() < deadline.getTime()) {
    return {
      branch,
      currentShift: openShift,
      autoStopped: false,
      autoStoppedAt: null,
      lastAutoStoppedShift: null
    };
  }

  const closedShift = await prisma.$transaction(async (tx) => {
    const latestOpen = await tx.waiterShift.findFirst({
      where: {
        id: openShift.id,
        status: "OPEN"
      },
      select: shiftSelect
    });

    if (!latestOpen) {
      return null;
    }

    return tx.waiterShift.update({
      where: { id: latestOpen.id },
      data: {
        status: "CLOSED",
        closedAt: deadline,
        closedById: waiterId,
        closingNote: latestOpen.closingNote
          ? `${latestOpen.closingNote} | Auto-stop (${shiftEnd.text})`
          : `Auto-stop (${shiftEnd.text})`,
        endingCash: latestOpen.endingCash ?? latestOpen.startingCash
      },
      select: shiftSelect
    });
  });

  return {
    branch,
    currentShift: null,
    autoStopped: Boolean(closedShift),
    autoStoppedAt: closedShift?.closedAt?.toISOString() ?? null,
    lastAutoStoppedShift: closedShift
  };
};

const getLatestShift = async (branchId: string, waiterId: string) => {
  return prisma.waiterShift.findFirst({
    where: {
      branchId,
      waiterId
    },
    orderBy: [{ openedAt: "desc" }],
    select: shiftSelect
  });
};

const ensureActiveShiftForAction = async (branchId: string, waiterId: string) => {
  const state = await resolveShiftAutoState(branchId, waiterId);

  if (!state.currentShift) {
    throw new MeError(409, "Avval smenani boshlang");
  }

  return {
    branch: state.branch,
    shift: state.currentShift,
    autoStopped: state.autoStopped,
    autoStoppedAt: state.autoStoppedAt
  };
};

export const meService = {
  async tables(waiterId: string, branchId: string) {
    try {
      await ensureWaiterInBranch(waiterId, branchId);
      const data = await tablesService.list(branchId);
      return data.filter((table) => table.status !== "DISABLED");
    } catch (error) {
      throw mapExternalError(error);
    }
  },

  async products(waiterId: string, branchId: string) {
    await ensureWaiterInBranch(waiterId, branchId);

    return prisma.product.findMany({
      where: {
        branchId,
        isActive: true,
        category: {
          isActive: true
        }
      },
      orderBy: [
        { category: { sortOrder: "asc" } },
        { sortOrder: "asc" },
        { createdAt: "asc" }
      ],
      select: {
        id: true,
        branchId: true,
        categoryId: true,
        name: true,
        sku: true,
        price: true,
        isActive: true,
        sortOrder: true,
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  },

  async shiftStatus(waiterId: string, branchId: string) {
    await ensureWaiterInBranch(waiterId, branchId);
    const state = await resolveShiftAutoState(branchId, waiterId);
    const latestShift = state.currentShift ?? state.lastAutoStoppedShift ?? (await getLatestShift(branchId, waiterId));

    return {
      branch: state.branch,
      autoStopped: state.autoStopped,
      autoStoppedAt: state.autoStoppedAt,
      currentShift: state.currentShift,
      latestShift
    };
  },

  async shiftStart(waiterId: string, branchId: string, payload: unknown) {
    await ensureWaiterInBranch(waiterId, branchId);

    if (payload !== undefined && !isObject(payload)) {
      throw new MeError(400, "So'rov ma'lumoti yaroqsiz");
    }
    const body = isObject(payload) ? payload : {};

    const state = await resolveShiftAutoState(branchId, waiterId);
    if (state.currentShift) {
      throw new MeError(409, "Smena allaqachon boshlangan");
    }

    const shiftEnd = parseShiftEndTime(state.branch.shiftEnd);
    if (shiftEnd) {
      const now = new Date();
      const todayCutoff = computeTodayShiftEnd(now, shiftEnd);
      if (now.getTime() >= todayCutoff.getTime()) {
        throw new MeError(409, "Bugungi smena tugash vaqti o'tgan");
      }
    }

    const startingCash =
      parseDecimalField(body.startingCash, "startingCash", { nullable: true }) ??
      new Prisma.Decimal(0);
    const openingNote = parseOptionalString(body.openingNote);

    const shift = await prisma.waiterShift.create({
      data: {
        branchId,
        waiterId,
        openedById: waiterId,
        status: "OPEN",
        startingCash: startingCash ?? new Prisma.Decimal(0),
        openingNote: openingNote ?? null
      },
      select: shiftSelect
    });

    return {
      branch: state.branch,
      autoStoppedBeforeStart: state.autoStopped,
      shift
    };
  },

  async shiftEnd(waiterId: string, branchId: string, payload: unknown) {
    await ensureWaiterInBranch(waiterId, branchId);

    if (payload !== undefined && !isObject(payload)) {
      throw new MeError(400, "So'rov ma'lumoti yaroqsiz");
    }
    const body = isObject(payload) ? payload : {};

    const state = await resolveShiftAutoState(branchId, waiterId);
    const currentShift = state.currentShift;

    if (!currentShift) {
      throw new MeError(409, "Ochiq smena topilmadi");
    }

    const endingCash = parseDecimalField(body.endingCash, "endingCash", { nullable: true });
    const closingNote = parseOptionalString(body.closingNote);

    const shift = await prisma.waiterShift.update({
      where: { id: currentShift.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedById: waiterId,
        ...(endingCash !== undefined ? { endingCash } : {}),
        ...(closingNote !== undefined ? { closingNote } : {})
      },
      select: shiftSelect
    });

    return {
      branch: state.branch,
      shift
    };
  },

  async openForTable(waiterId: string, branchId: string, payload: unknown) {
    try {
      await ensureWaiterInBranch(waiterId, branchId);
      const activeShift = await ensureActiveShiftForAction(branchId, waiterId);

      const result = await ordersService.openForTable({
        branchId,
        actor: {
          userId: waiterId,
          role: "WAITER",
          shiftId: activeShift.shift.id
        },
        payload
      });

      return {
        ...result,
        shift: activeShift.shift
      };
    } catch (error) {
      throw mapExternalError(error);
    }
  },

  async addItem(waiterId: string, branchId: string, orderIdRaw: unknown, payload: unknown) {
    try {
      await ensureWaiterInBranch(waiterId, branchId);
      const activeShift = await ensureActiveShiftForAction(branchId, waiterId);

      const result = await ordersService.addItem({
        branchId,
        actor: {
          userId: waiterId,
          role: "WAITER",
          shiftId: activeShift.shift.id
        },
        orderIdRaw,
        payload
      });

      return {
        ...result,
        shift: activeShift.shift
      };
    } catch (error) {
      throw mapExternalError(error);
    }
  }
};
