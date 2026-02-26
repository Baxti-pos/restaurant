import { CategoriesError, categoriesService } from "./categories.service.js";
const handleError = (res, error) => {
    if (error instanceof CategoriesError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    console.error("Categories controller xatosi:", error);
    return res.status(500).json({
        message: "Ichki server xatosi"
    });
};
const getContext = (req) => {
    const ownerId = req.auth?.sub;
    const branchId = req.activeBranchId;
    if (!ownerId || !branchId) {
        return null;
    }
    return { ownerId, branchId };
};
export const categoriesController = {
    async list(req, res) {
        try {
            const ctx = getContext(req);
            if (!ctx) {
                return res.status(401).json({ message: "Autorizatsiya talab qilinadi" });
            }
            const data = await categoriesService.list(ctx.ownerId, ctx.branchId);
            return res.status(200).json({
                message: "Kategoriyalar ro'yxati",
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
            const data = await categoriesService.getById(ctx.ownerId, ctx.branchId, req.params.categoryId);
            return res.status(200).json({
                message: "Kategoriya ma'lumoti",
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
            const data = await categoriesService.create(ctx.ownerId, ctx.branchId, req.body);
            return res.status(201).json({
                message: "Kategoriya yaratildi",
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
            const data = await categoriesService.update(ctx.ownerId, ctx.branchId, req.params.categoryId, req.body);
            return res.status(200).json({
                message: "Kategoriya yangilandi",
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
            const data = await categoriesService.remove(ctx.ownerId, ctx.branchId, req.params.categoryId);
            return res.status(200).json({
                message: "Kategoriya nofaol qilindi",
                data
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    }
};
