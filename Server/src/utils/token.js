import config from "../config/config.js";
import jwt from "jsonwebtoken";

export const generateAccessToken = ({userId, role}) => {
  const accessToken = jwt.sign({ userId, role }, config.accessTokenSecret, {
    expiresIn: "15m",
  });
  return accessToken;
};

export const generateRefreshToken = ({userId, role}) => {
  const refreshToken = jwt.sign({ userId, role }, config.refreshTokenSecret, {
    expiresIn: "7d",
  });
  return refreshToken;
};

export const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, config.accessTokenSecret);
  return decoded;
};
export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, config.refreshTokenSecret);
  return decoded;
};
