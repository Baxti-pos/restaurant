import { AuthError, authService } from "./auth.service.js";
const handleError = (res, error) => {
    if (error instanceof AuthError) {
        return res.status(error.statusCode).json({
            message: error.message
        });
    }
    console.error("Auth controller xatosi:", error);
    return res.status(500).json({
        message: "Ichki server xatosi"
    });
};
export const authController = {
    async login(req, res) {
        try {
            const result = await authService.login(req.body ?? {});
            return res.status(200).json({
                message: "Muvaffaqiyatli tizimga kirildi",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async selectBranch(req, res) {
        try {
            if (!req.auth) {
                return res.status(401).json({
                    message: "Autorizatsiya talab qilinadi"
                });
            }
            const result = await authService.selectBranch({
                userId: req.auth.sub,
                role: req.auth.role,
                branchId: req.body?.branchId
            });
            return res.status(200).json({
                message: "Filial muvaffaqiyatli tanlandi",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async me(req, res) {
        try {
            if (!req.auth) {
                return res.status(401).json({
                    message: "Autorizatsiya talab qilinadi"
                });
            }
            const result = await authService.getOwnerProfile({
                userId: req.auth.sub,
                role: req.auth.role,
                activeBranchId: req.auth.activeBranchId
            });
            return res.status(200).json({
                message: "Owner profili",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    },
    async updateMe(req, res) {
        try {
            if (!req.auth) {
                return res.status(401).json({
                    message: "Autorizatsiya talab qilinadi"
                });
            }
            const result = await authService.updateOwnerProfile({
                userId: req.auth.sub,
                role: req.auth.role,
                activeBranchId: req.auth.activeBranchId
            }, req.body ?? {});
            return res.status(200).json({
                message: "Owner profili yangilandi",
                data: result
            });
        }
        catch (error) {
            return handleError(res, error);
        }
    }
};
