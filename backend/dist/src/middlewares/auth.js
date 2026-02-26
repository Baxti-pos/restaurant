import { AuthError, verifyAccessToken } from "../modules/auth/auth.service.js";
const extractBearerToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        return null;
    }
    const [scheme, token] = authorizationHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
        return null;
    }
    return token;
};
export const authMiddleware = (req, res, next) => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
        return res.status(401).json({
            message: "Autorizatsiya tokeni talab qilinadi"
        });
    }
    try {
        req.auth = verifyAccessToken(token);
        return next();
    }
    catch (error) {
        if (error instanceof AuthError) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }
        return res.status(401).json({
            message: "Token yaroqsiz yoki muddati tugagan"
        });
    }
};
