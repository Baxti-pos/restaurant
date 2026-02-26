export const requireRoles = (roles) => {
    return (req, res, next) => {
        if (!req.auth) {
            return res.status(401).json({
                message: "Autorizatsiya talab qilinadi"
            });
        }
        if (!roles.includes(req.auth.role)) {
            return res.status(403).json({
                message: "Ushbu amal uchun ruxsat yo'q"
            });
        }
        return next();
    };
};
