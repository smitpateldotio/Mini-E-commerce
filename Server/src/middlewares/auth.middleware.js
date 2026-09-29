import { verifyAccessToken } from "../utils/token.js";

export const authenticate = async (req, res,next) =>{
    const accessToken = req.headers.authorization?.split(" ")[1];
    if (!accessToken) {
      return res.status(401).json({ message: "Access token missing" });
    }
    try{
        const decoded = verifyAccessToken(accessToken);
        req.user = decoded;
        next();
    }catch(error){
        return res.status(403).json({ message: "Invalid access token,or expired refresh token" });
    }
}
export function authenticateSeller(req, res, next) {

    if (req.user.role !== "seller") {
        return res.status(403).json({
            message: "user is not authorized to perform this action."
        })
    }
    next()

}