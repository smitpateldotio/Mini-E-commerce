import { body, validationResult } from "express-validator";

export const createOrderValidator = [
  body("items")
    .isArray({ min: 1, max: 20 })
    .withMessage("Add between 1 and 20 items to your order")
    .bail()
    .custom((items) => {
      const keys = items.map((item) => `${item.productId}:${item.size}`);
      if (new Set(keys).size !== keys.length) {
        throw new Error("Combine quantities for duplicate product sizes");
      }
      return true;
    }),
  body("items.*.productId")
    .isMongoId()
    .withMessage("Each item must have a valid product"),
  body("items.*.size")
    .isIn(["XS", "S", "M", "L", "XL", "XXL"])
    .withMessage("Each item must have a valid size"),
  body("items.*.quantity")
    .isInt({ min: 1, max: 20 })
    .withMessage("Item quantity must be between 1 and 20")
    .toInt(),
  body("shippingAddress.name")
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Enter the recipient's name"),
  body("shippingAddress.phone")
    .matches(/^[+\d\s()-]{7,20}$/)
    .withMessage("Enter a valid phone number"),
  body("shippingAddress.addressLine")
    .isString()
    .trim()
    .isLength({ min: 5, max: 160 })
    .withMessage("Enter a valid street address"),
  body("shippingAddress.city")
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Enter a valid city"),
  body("shippingAddress.state")
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Enter a valid state or region"),
  body("shippingAddress.postalCode")
    .isString()
    .trim()
    .isLength({ min: 3, max: 16 })
    .withMessage("Enter a valid postal code"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Invalid order", errors: errors.array() });
    }
    next();
  },
];
