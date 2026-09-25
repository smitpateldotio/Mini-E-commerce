import { body, validationResult } from "express-validator";
export const registerValidator = [
  body("name")
    .exists()
    .withMessage("Name is required")
    .bail()
    .isString()
    .withMessage("Name must be in Text format")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required"),
  body("email")
    .exists()
    .withMessage("Email is required")
    .bail()
    .isString()
    .withMessage("Email must be in Text format")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail("Email is not valid")
    .toLowerCase(),
  body("password")
    .exists()
    .withMessage("password is required")
    .bail()
    .isString()
    .withMessage("password must be in Text format")
    .bail()
    .notEmpty()
    .withMessage("password is required"),
  body("confirmPassword")
    .exists()
    .withMessage("confirm password is required")
    .bail()
    .isString()
    .withMessage("confirm password must be in Text format")
    .bail()
    .notEmpty()
    .withMessage("confirm password is required")
    .custom((confirmPassword, { req }) => {
      if (confirmPassword !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Invalid request",
        error: {
          error: errors.array(),
        },
      });
    }
    next();
  },
];

export const loginValidator = [
  body("email")
    .exists()
    .withMessage("Email is required")
    .bail()
    .isString()
    .withMessage("Email must be in string")
    .bail()
    .trim()
    .isEmail()
    .withMessage("Email is not valid")
    .bail()
    .toLowerCase(),
  body("password")
    .exists("Password is required")
    .isString()
    .withMessage("Password must be String")
    .bail()
    .trim(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Invalid request",
        error: {
          error: errors.array(),
        },
      });
    }
    next();
  },
];
