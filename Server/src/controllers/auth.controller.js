import UserModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token.js";

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }
    const user = await UserModel.create({
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
    });
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id,
      role: user.role,
    });
    await UserModel.findByIdAndUpdate(user._id, { refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
    });
    res.status(201).json({
      message: "User registered successfully",
      data: {
        user: { name: user.name, email: user.email },
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user._id,
      role: user.role,
    });
    await UserModel.findByIdAndUpdate(user._id, { refreshToken });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
    });
    res.status(200).json({
      message: "User logged in successfully",
      data: {
        user: { name: user.name, email: user.email },
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getMe = async (req, res) => {
  const { userId } = req.user;
  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.status(200).json({
    message: "User retrieved successfully",
    data: {
      user: { name: user.name, email: user.email },
    },
  });
};
export const refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "invalid token" });
  }
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const user = await UserModel.findById(decoded.userId);

    if (!user || user.refreshToken !== refreshToken) {
      if (user)
        await UserModel.findByIdAndUpdate(user._id, { refreshToken: null });

      return res.status(403).json({ message: "Invalid refresh token" });
    }
    const newAccessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({
      userId: user._id,
      role: user.role,
    });
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
    });
    await UserModel.findByIdAndUpdate(user._id, {
      refreshToken: newRefreshToken,
    });
    res.status(200).json({
      message: "Token refreshed successfully",
      data: {
        user: { name: user.name, email: user.email },
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const logoutUser = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token not found" });
  }

  try {
    // const decoded = verifyRefreshToken(refreshToken);
    // const user = await UserModel.findById(decoded.userId);
    // if (!user || user.refreshToken !== refreshToken) {
    //   return res.status(403).json({ message: "Invalid refresh token" });
    // }
    const { userId } = req.user;
    await UserModel.findByIdAndUpdate(userId, { refreshToken: null });
    res.clearCookie("refreshToken");
    req.headers.authorization = null;
    res.status(200).json({ message: "User logged out successfully" });
  } catch (error) {
    console.error("Error logging out user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
