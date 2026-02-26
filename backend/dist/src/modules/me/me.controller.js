import { OrdersError } from "../orders/orders.service.js";
import { TablesError } from "../tables/tables.service.js";
import { emitToBranch } from "../../socket/index.js";
import { MeError, meService } from "./me.service.js";
const handleError = (res, error) => {
    if (error instanceof MeError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    if (error instanceof OrdersError || error instanceof TablesError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    console.error("Me controller xatosi:", error);
    return res.status(500).json({
        message: "Ichki server xatosi"
    });
};
const emitSafe = (branchId, event, payload) => {
    try {
        emitToBranch(branchId, event, payload);
    }
    catch (error) {
        console.error(`${event} emit xatosi:`, error);
    }
};
const emitTablesUpdated = (branchId, action, tableId) => {
    emitSafe(branchId, "tables.updated", {
        action,
        tableId,
        branchId,
        timestamp: new Date().toISOString()
    });
};
const emitOrderUpdated = (branchId, action, orderId) => {
    emitSafe(branchId, "order.updated", {
        action,
        orderId,
        branchId,
        timestamp: new Date().toISOString()
    });
};
const getWaiterContext = (req) => {
    const waiterId = req.auth?.sub;
    const branchId = req.activeBranchId;
    if (!waiterId || !branchId) {
        return null;
    }
    return { waiterId, branchId };
};
export const meController = {
    async tables(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await meService.tables(ctx.waiterId, ctx.branchId);
            return res.status(200).json({
                message: "Waiter uchun stollar ro'yxati",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async products(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await meService.products(ctx.waiterId, ctx.branchId);
            return res.status(200).json({
                message: "Waiter uchun mahsulotlar ro'yxati",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async shiftStatus(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await meService.shiftStatus(ctx.waiterId, ctx.branchId);
            return res.status(200).json({
                message: "Smena holati",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async shiftStart(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await meService.shiftStart(ctx.waiterId, ctx.branchId, req.body);
            return res.status(201).json({
                message: "Smena boshlandi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async shiftEnd(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await meService.shiftEnd(ctx.waiterId, ctx.branchId, req.body);
            return res.status(200).json({
                message: "Smena yakunlandi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async openForTable(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const result = await meService.openForTable(ctx.waiterId, ctx.branchId, req.body);
            emitOrderUpdated(ctx.branchId, result.created ? "opened" : "opened_existing", result.order.id);
            if (result.tableStatusChanged) {
                emitTablesUpdated(ctx.branchId, "occupied", result.table.id);
            }
            return res.status(result.created ? 201 : 200).json({
                message: result.created
                    ? "Stol uchun buyurtma ochildi"
                    : "Stolda mavjud ochiq buyurtma qaytarildi",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async addItem(req, res) {
        try {
            const ctx = getWaiterContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const result = await meService.addItem(ctx.waiterId, ctx.branchId, req.params.orderId, req.body);
            emitOrderUpdated(ctx.branchId, "item_added", result.order.id);
            return res.status(200).json({
                message: "Item buyurtmaga qo'shildi",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    }
};
