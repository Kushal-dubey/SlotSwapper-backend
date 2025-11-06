import express from "express";
import auth from "../middleware/authMiddlewar.js";

const router = express.Router();

router.get("/me", auth, (req, res) => {
  // req.user set by middleware
  res.json({ user: req.user });
});

export default router;
