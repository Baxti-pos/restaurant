import { emitToBranch } from "../../socket/index.js";
import { ProductsError, productsService } from "./products.service.js";
const handleError = (res, error) => {
    if (error instanceof ProductsError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    console.error("Products controller xatosi:", error);
    return res.status(500).json({
        message: "Ichki server xatosi"
    });
};
const getContext = (req) => {
    const ownerId = req.ownerScopeId;
    const branchId = req.activeBranchId;
    if (!ownerId || !branchId) {
        return null;
    }
    return { ownerId, branchId };
};
const emitProductsUpdated = (branchId, action, productId) => {
    try {
        emitToBranch(branchId, "products.updated", {
            action,
            productId,
            branchId,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("products.updated emit xatosi:", error);
    }
};
export const productsController = {
    async list(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await productsService.list(ctx.ownerId, ctx.branchId);
            return res.status(200).json({
                message: "Mahsulotlar ro'yxati",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async getById(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await productsService.getById(ctx.ownerId, ctx.branchId, req.params.productId);
            return res.status(200).json({
                message: "Mahsulot ma'lumoti",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async create(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await productsService.create(ctx.ownerId, ctx.branchId, req.body);
            emitProductsUpdated(ctx.branchId, "created", data.id);
            return res.status(201).json({
                message: "Mahsulot yaratildi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async update(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await productsService.update(ctx.ownerId, ctx.branchId, req.params.productId, req.body);
            emitProductsUpdated(ctx.branchId, "updated", data.id);
            return res.status(200).json({
                message: "Mahsulot yangilandi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async remove(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await productsService.remove(ctx.ownerId, ctx.branchId, req.params.productId);
            emitProductsUpdated(ctx.branchId, "deleted", data.id);
            return res.status(200).json({
                message: "Mahsulot nofaol qilindi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    }
};
