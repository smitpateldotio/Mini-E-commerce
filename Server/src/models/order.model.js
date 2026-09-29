import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Types.ObjectId,
          ref: "products",
          required: true,
        },
        title: { type: String, required: true },
        size: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        currency: { type: String, enum: ["INR", "USD"], required: true },
      },
    ],
    subtotal: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR", "USD"], required: true },
    shippingAddress: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ["cash-on-delivery"],
      default: "cash-on-delivery",
    },
    status: {
      type: String,
      enum: ["confirmed", "processing", "shipped", "delivered", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true },
);

const orderModel = mongoose.model("orders", orderSchema);

export default orderModel;
