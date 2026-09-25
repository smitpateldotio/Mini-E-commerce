import {Router} from 'express';
import { loginValidator, registerValidator } from '../validators/user.validator.js';
import { getMe, loginUser, logoutUser, refreshToken, registerUser } from '../controllers/auth.controller.js';
import { authMe } from '../middlewares/auth.middleware.js';
const router = Router();

router.post('/register', registerValidator, registerUser);
router.post('/login',loginValidator, loginUser) ;
router.post("/refresh-token",refreshToken)
router.get("/me", authMe, getMe)
router.post("/logout",authMe, logoutUser)
export default router;