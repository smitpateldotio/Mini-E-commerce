import orderModel from "../models/order.model.js";
import productModel from "../models/product.model.js";

export async function createOrder(req, res) {
  const { items, shippingAddress } = req.body;
  const products = await productModel.find({
    _id: { $in: items.map((item) => item.productId) },
    published: true,
  });
  const productsById = new Map(
    products.map((product) => [String(product._id), product]),
  );

  if (productsById.size !== new Set(items.map((item) => item.productId)).size) {
    return res
      .status(404)
      .json({ message: "One or more products are no longer available" });
  }

  const currencies = new Set(products.map((product) => product.price.currency));
  if (currencies.size !== 1) {
    return res
      .status(400)
      .json({ message: "All items in an order must use the same currency" });
  }

  const reserved = [];
  try {
    const orderItems = [];
    for (const item of items) {
      const product = productsById.get(item.productId);
      const updatedProduct = await productModel.findOneAndUpdate(
        {
          _id: item.productId,
          published: true,
          sizes: {
            $elemMatch: { size: item.size, stock: { $gte: item.quantity } },
          },
        },
        { $inc: { "sizes.$.stock": -item.quantity } },
        { new: true },
      );

      if (!updatedProduct) {
        const error = new Error(
          `${product.title} in size ${item.size} is out of stock`,
        );
        error.status = 409;
        throw error;
      }

      reserved.push(item);
      orderItems.push({
        product: product._id,
        title: product.title,
        size: item.size,
        quantity: item.quantity,
        unitPrice: product.price.amount,
        currency: product.price.currency,
      });
    }

    const order = await orderModel.create({
      buyer: req.user.userId,
      items: orderItems,
      subtotal: orderItems.reduce(
        (total, item) => total + item.unitPrice * item.quantity,
        0,
      ),
      currency: [...currencies][0],
      shippingAddress,
    });

    return res
      .status(201)
      .json({ message: "Order placed successfully", data: { order } });
  } catch (error) {
    await Promise.all(
      reserved.map((item) =>
        productModel.updateOne(
          { _id: item.productId, "sizes.size": item.size },
          { $inc: { "sizes.$.stock": item.quantity } },
        ),
      ),
    );
    return res.status(error.status || 500).json({
      message: error.status ? error.message : "Unable to place order",
    });
  }
}

export async function listMyOrders(req, res) {
  const orders = await orderModel
    .find({ buyer: req.user.userId })
    .populate("items.product", "title images")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json({ message: "Orders fetched successfully", data: { orders } });
}
