import express from "express";
import authRoutes from "./routes/auth.routes.js";
import cookieParser from "cookie-parser";
import productRoutes from "./routes/product.routes.js";
import orderRoutes from "./routes/order.routes.js";
const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  if (req.headers.origin === clientOrigin) {
    res.setHeader("Access-Control-Allow-Origin", clientOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
export default app;
