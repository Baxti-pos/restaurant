import { emitToBranch } from "../../socket/index.js";
import { TablesError, tablesService } from "./tables.service.js";
const handleError = (res, error) => {
    if (error instanceof TablesError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    console.error("Tables controller xatosi:", error);
    return res.status(500).json({
        message: "Ichki server xatosi"
    });
};
const emitTablesUpdated = (branchId, action, tableId) => {
    try {
        emitToBranch(branchId, "tables.updated", {
            action,
            tableId,
            branchId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("tables.updated emit xatosi:", error);
    }
};
const getBaseContext = (req) => {
    const branchId = req.activeBranchId;
    const auth = req.auth;
    if (!auth || !branchId) {
        return null;
    }
    return {
        auth,
        branchId
    };
};
export const tablesController = {
    async list(req, res) {
        try {
            const ctx = getBaseContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await tablesService.list(ctx.branchId);
            return res.status(200).json({
                message: "Stollar ro'yxati",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async getById(req, res) {
        try {
            const ctx = getBaseContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await tablesService.getById(ctx.branchId, req.params.tableId);
            return res.status(200).json({
                message: "Stol ma'lumoti",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async create(req, res) {
        try {
            const ctx = getBaseContext(req);
            if (!ctx || ctx.auth.role !== "OWNER") {
                return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
            }
            const data = await tablesService.create(ctx.auth.sub, ctx.branchId, req.body);
            emitTablesUpdated(ctx.branchId, "created", data.id);
            return res.status(201).json({
                message: "Stol yaratildi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async update(req, res) {
        try {
            const ctx = getBaseContext(req);
            if (!ctx || ctx.auth.role !== "OWNER") {
                return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
            }
            const data = await tablesService.update(ctx.auth.sub, ctx.branchId, req.params.tableId, req.body);
            emitTablesUpdated(ctx.branchId, "updated", data.id);
            return res.status(200).json({
                message: "Stol yangilandi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async remove(req, res) {
        try {
            const ctx = getBaseContext(req);
            if (!ctx || ctx.auth.role !== "OWNER") {
                return res.status(403).json({ message: "Ushbu amal uchun ruxsat yo'q" });
            }
            const data = await tablesService.remove(ctx.auth.sub, ctx.branchId, req.params.tableId);
            emitTablesUpdated(ctx.branchId, "disabled", data.id);
            return res.status(200).json({
                message: "Stol nofaol qilindi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    }
};
