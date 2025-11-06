// routes/swapRoutes.js
import express from "express";
import auth from "../middleware/authMiddlewar.js";
import {
  getSwappableSlots,
  createSwapRequest,
  respondToSwap,
  getRequestsForUser
} from "../controllers/swapController.js";

const router = express.Router();

router.get("/swappable-slots", auth, getSwappableSlots);       // GET /api/swappable-slots
router.post("/swap-request", auth, createSwapRequest);         // POST /api/swap-request
router.post("/swap-response/:requestId", auth, respondToSwap);// POST /api/swap-response/:requestId
router.get("/requests", auth, getRequestsForUser);            // GET /api/requests

export default router;
