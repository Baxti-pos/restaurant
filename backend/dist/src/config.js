import "dotenv/config";
const toNumber = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
export const config = {
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: toNumber(process.env.PORT, 4000),
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
    jwtSecret: process.env.JWT_SECRET ?? "change-me",
    databaseUrl: process.env.DATABASE_URL ?? ""
};
