import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { branchesRouter } from "./modules/branches/branches.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { managersRouter } from "./modules/managers/managers.routes.js";
import { meRouter } from "./modules/me/me.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { reportsRouter } from "./modules/reports/reports.routes.js";
import { tablesRouter } from "./modules/tables/tables.routes.js";
import { waitersRouter } from "./modules/waiters/waiters.routes.js";

export const app = express();

app.use(
  cors({
    origin: config.corsOrigin === "*" ? true : config.corsOrigin,
    credentials: true
  })
);
app.use(express.json());

app.use((req, res, next) => {
  const startedAt = Date.now();
  const startedAtIso = new Date(startedAt).toISOString();

  console.log(
    `[REQ] ${startedAtIso} ${req.method} ${req.originalUrl} ip=${req.ip ?? "-"}`
  );

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const finishedAtIso = new Date().toISOString();

    console.log(
      `[RES] ${finishedAtIso} ${req.method} ${req.originalUrl} status=${res.statusCode} duration=${durationMs}ms`
    );
  });

  next();
});

app.use("/auth", authRouter);
app.use("/branches", branchesRouter);
app.use("/waiters", waitersRouter);
app.use("/managers", managersRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);
app.use("/tables", tablesRouter);
app.use("/orders", ordersRouter);
app.use("/expenses", expensesRouter);
app.use("/reports", reportsRouter);
app.use("/me", meRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "baxti-pos-backend",
    timestamp: new Date().toISOString()
  });
});
