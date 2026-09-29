import { Router } from "express";
import { createOrder, listMyOrders } from "../controllers/order.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { createOrderValidator } from "../validators/order.validator.js";

const router = Router();

router.post("/", authenticate, createOrderValidator, createOrder);
router.get("/", authenticate, listMyOrders);

export default router;
