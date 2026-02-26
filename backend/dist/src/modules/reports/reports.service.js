import { TableStatus, UserRole } from "@prisma/client";
import { prisma } from "../../prisma.js";
export class ReportsError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "ReportsError";
    }
}
const ensureOwnedActiveBranch = async (ownerId, branchId) => {
    const branch = await prisma.branch.findFirst({
        where: {
            id: branchId,
            ownerId,
            isActive: true
        },
        select: { id: true, name: true }
    });
    if (!branch) {
        throw new ReportsError(404, "Faol filial topilmadi");
    }
    return branch;
};
const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const parseDateRange = (query, defaults) => {
    const now = new Date();
    let defaultFrom;
    let defaultTo;
    if (defaults === "today") {
        defaultFrom = new Date(now);
        defaultFrom.setHours(0, 0, 0, 0);
        defaultTo = new Date(now);
        defaultTo.setHours(23, 59, 59, 999);
    }
    else {
        defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        defaultTo = new Date(now);
        defaultTo.setHours(23, 59, 59, 999);
    }
    const parseOne = (raw, label, fallback) => {
        if (typeof raw !== "string" || !raw.trim()) {
            return fallback;
        }
        const trimmed = raw.trim();
        const date = isDateOnly(trimmed)
            ? new Date(`${trimmed}T${label === "from" ? "00:00:00.000" : "23:59:59.999"}`)
            : new Date(trimmed);
        if (Number.isNaN(date.getTime())) {
            throw new ReportsError(400, `${label} sanasi yaroqsiz`);
        }
        return date;
    };
    const from = parseOne(query?.from, "from", defaultFrom);
    const to = parseOne(query?.to, "to", defaultTo);
    if (from > to) {
        throw new ReportsError(400, "from sanasi to sanasidan katta bo'lishi mumkin emas");
    }
    return { from, to };
};
const toDateKey = (date) => date.toISOString().slice(0, 10);
export const reportsService = {
    async salesSummary(ownerId, branchId, query) {
        const branch = await ensureOwnedActiveBranch(ownerId, branchId);
        const range = parseDateRange(query, "month");
        const closedOrders = await prisma.order.findMany({
            where: {
                branchId,
                status: "CLOSED",
                closedAt: {
                    gte: range.from,
                    lte: range.to
                }
            },
            orderBy: [{ closedAt: "asc" }],
            select: {
                id: true,
                closedAt: true,
                subtotalAmount: true,
                discountAmount: true,
                totalAmount: true,
                paidAmount: true
            }
        });
        const byDayMap = new Map();
        for (const order of closedOrders) {
            if (!order.closedAt) {
                continue;
            }
            const key = toDateKey(order.closedAt);
            const current = byDayMap.get(key) ??
                {
                    date: key,
                    ordersCount: 0,
                    subtotalAmount: 0,
                    discountAmount: 0,
                    totalAmount: 0,
                    paidAmount: 0
                };
            current.ordersCount += 1;
            current.subtotalAmount += Number(order.subtotalAmount);
            current.discountAmount += Number(order.discountAmount);
            current.totalAmount += Number(order.totalAmount);
            current.paidAmount += Number(order.paidAmount);
            byDayMap.set(key, current);
        }
        const byDay = Array.from(byDayMap.values());
        const summary = byDay.reduce((acc, day) => {
            acc.ordersCount += day.ordersCount;
            acc.subtotalAmount += day.subtotalAmount;
            acc.discountAmount += day.discountAmount;
            acc.totalAmount += day.totalAmount;
            acc.paidAmount += day.paidAmount;
            return acc;
        }, {
            ordersCount: 0,
            subtotalAmount: 0,
            discountAmount: 0,
            totalAmount: 0,
            paidAmount: 0
        });
        return {
            branch,
            range,
            summary,
            byDay
        };
    },
    async dashboard(ownerId, branchId, query) {
        const branch = await ensureOwnedActiveBranch(ownerId, branchId);
        const range = parseDateRange(query, "today");
        const [tables, activeProductsCount, activeCategoriesCount, activeWaitersCount, openShiftsCount, openOrdersCount, closedOrders, expenses] = await Promise.all([
            prisma.table.groupBy({
                by: ["status"],
                where: { branchId },
                _count: { _all: true }
            }),
            prisma.product.count({
                where: { branchId, isActive: true }
            }),
            prisma.category.count({
                where: { branchId, isActive: true }
            }),
            prisma.user.count({
                where: { branchId, role: UserRole.WAITER, isActive: true }
            }),
            prisma.waiterShift.count({
                where: { branchId, status: "OPEN" }
            }),
            prisma.order.count({
                where: { branchId, status: "OPEN" }
            }),
            prisma.order.findMany({
                where: {
                    branchId,
                    status: "CLOSED",
                    closedAt: {
                        gte: range.from,
                        lte: range.to
                    }
                },
                select: {
                    id: true,
                    totalAmount: true,
                    paidAmount: true,
                    discountAmount: true
                }
            }),
            prisma.expense.findMany({
                where: {
                    branchId,
                    spentAt: {
                        gte: range.from,
                        lte: range.to
                    }
                },
                select: {
                    id: true,
                    amount: true
                }
            })
        ]);
        const tableStats = {
            total: 0,
            available: 0,
            occupied: 0,
            disabled: 0
        };
        for (const row of tables) {
            tableStats.total += row._count._all;
            if (row.status === TableStatus.AVAILABLE) {
                tableStats.available += row._count._all;
            }
            if (row.status === TableStatus.OCCUPIED) {
                tableStats.occupied += row._count._all;
            }
            if (row.status === TableStatus.DISABLED) {
                tableStats.disabled += row._count._all;
            }
        }
        const sales = closedOrders.reduce((acc, order) => {
            acc.closedOrdersCount += 1;
            acc.totalAmount += Number(order.totalAmount);
            acc.paidAmount += Number(order.paidAmount);
            acc.discountAmount += Number(order.discountAmount);
            return acc;
        }, {
            closedOrdersCount: 0,
            totalAmount: 0,
            paidAmount: 0,
            discountAmount: 0
        });
        const expenseAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        return {
            branch,
            range,
            stats: {
                tables: tableStats,
                products: {
                    activeCount: activeProductsCount
                },
                categories: {
                    activeCount: activeCategoriesCount
                },
                waiters: {
                    activeCount: activeWaitersCount,
                    openShiftsCount
                },
                orders: {
                    openCount: openOrdersCount,
                    closedCountInRange: sales.closedOrdersCount
                },
                finance: {
                    salesTotal: sales.totalAmount,
                    paidTotal: sales.paidAmount,
                    discountTotal: sales.discountAmount,
                    expenseTotal: expenseAmount,
                    netCashflow: sales.paidAmount - expenseAmount
                }
            }
        };
    },
    async waiterActivity(ownerId, branchId, query) {
        const branch = await ensureOwnedActiveBranch(ownerId, branchId);
        const range = parseDateRange(query, "month");
        const waiterId = typeof query?.waiterId === "string" && query.waiterId.trim()
            ? query.waiterId.trim()
            : undefined;
        const waiters = await prisma.user.findMany({
            where: {
                branchId,
                role: UserRole.WAITER,
                ...(waiterId ? { id: waiterId } : {})
            },
            select: {
                id: true,
                fullName: true,
                isActive: true
            }
        });
        const waiterMap = new Map(waiters.map((waiter) => [
            waiter.id,
            {
                waiterId: waiter.id,
                fullName: waiter.fullName,
                isActive: waiter.isActive,
                closedOrdersCount: 0,
                openOrdersCount: 0,
                itemsCount: 0,
                salesTotal: 0,
                paidTotal: 0,
                discountTotal: 0,
                shiftsOpenedCount: 0,
                shiftsClosedCount: 0,
                currentOpenShift: false,
                lastOrderAt: null,
                lastShiftAt: null
            }
        ]));
        const [orders, shifts] = await Promise.all([
            prisma.order.findMany({
                where: {
                    branchId,
                    ...(waiterId ? { waiterId } : {}),
                    OR: [
                        {
                            status: "CLOSED",
                            closedAt: {
                                gte: range.from,
                                lte: range.to
                            }
                        },
                        {
                            status: "OPEN",
                            openedAt: {
                                gte: range.from,
                                lte: range.to
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    waiterId: true,
                    status: true,
                    totalAmount: true,
                    paidAmount: true,
                    discountAmount: true,
                    closedAt: true,
                    openedAt: true,
                    items: {
                        select: {
                            quantity: true
                        }
                    }
                }
            }),
            prisma.waiterShift.findMany({
                where: {
                    branchId,
                    ...(waiterId ? { waiterId } : {}),
                    openedAt: {
                        lte: range.to
                    },
                    OR: [
                        {
                            openedAt: {
                                gte: range.from
                            }
                        },
                        {
                            closedAt: {
                                gte: range.from,
                                lte: range.to
                            }
                        },
                        {
                            status: "OPEN"
                        }
                    ]
                },
                select: {
                    id: true,
                    waiterId: true,
                    status: true,
                    openedAt: true,
                    closedAt: true
                }
            })
        ]);
        for (const order of orders) {
            if (!order.waiterId) {
                continue;
            }
            const row = waiterMap.get(order.waiterId);
            if (!row) {
                continue;
            }
            if (order.status === "CLOSED") {
                row.closedOrdersCount += 1;
                row.salesTotal += Number(order.totalAmount);
                row.paidTotal += Number(order.paidAmount);
                row.discountTotal += Number(order.discountAmount);
            }
            else if (order.status === "OPEN") {
                row.openOrdersCount += 1;
            }
            row.itemsCount += order.items.reduce((sum, item) => sum + item.quantity, 0);
            const orderTime = (order.closedAt ?? order.openedAt).toISOString();
            if (!row.lastOrderAt || orderTime > row.lastOrderAt) {
                row.lastOrderAt = orderTime;
            }
        }
        for (const shift of shifts) {
            const row = waiterMap.get(shift.waiterId);
            if (!row) {
                continue;
            }
            row.shiftsOpenedCount += 1;
            if (shift.status === "CLOSED") {
                row.shiftsClosedCount += 1;
            }
            if (shift.status === "OPEN") {
                row.currentOpenShift = true;
            }
            const shiftTime = (shift.closedAt ?? shift.openedAt).toISOString();
            if (!row.lastShiftAt || shiftTime > row.lastShiftAt) {
                row.lastShiftAt = shiftTime;
            }
        }
        const data = Array.from(waiterMap.values()).sort((a, b) => a.fullName.localeCompare(b.fullName));
        return {
            branch,
            range,
            data
        };
    }
};
