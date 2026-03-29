import express from "express";
import { registerUser } from "../controllers/registerController.js";
import { loginUser } from "../controllers/loginController.js";
import {
  forgotUsername,
  forgotPassword,
  resetPassword,
  sendOtp,
  verifyOtp,
  resendOtp,
  sendVerificationEmail,
  getVerificationEmailPreview,
  verifyEmailByBody,
  verifyEmailByParam,
} from "../controllers/authController.js";
import { googleLogin, facebookLogin } from "../controllers/oauthController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

// OAuth routes
router.post("/google", googleLogin);
router.post("/facebook", facebookLogin);

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/send-verification-email", sendVerificationEmail);
router.get("/verification-email/:userId", getVerificationEmailPreview);
router.post("/verify-email", verifyEmailByBody);
router.get("/verify-email/:token", verifyEmailByParam);

router.post("/forgot-username", forgotUsername);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
