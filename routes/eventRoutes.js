import express from "express";
import auth from "../middleware/authMiddlewar.js";
import { createEvent, getMyEvents,updateEvent,deleteEvent } from "../controllers/eventController.js";

const router = express.Router();

router.post("/", auth, createEvent); // POST /api/events
router.get("/", auth,getMyEvents ); //GET /api/ events
router.put("/:id", auth ,updateEvent); //PUT /api/events/ :id
router.delete("/", auth, deleteEvent); //DELETE /api/events/ :id


export default router;  //  IMPORTANT: This line fixes your error
