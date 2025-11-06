import express from "express";
import { signup,login } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup",signup); // POST /api/auth/signup
router.post("/login",login);  // POST /api/auth/login

export default router;
