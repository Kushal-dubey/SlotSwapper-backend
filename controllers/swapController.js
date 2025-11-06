// controllers/swapController.js
import SwapRequest from "../models/SwapRequest.js";
import Event from "../models/Event.js";
import mongoose from "mongoose";

/**
 * GET /api/swappable-slots
 * Return events with status SWAPPABLE that DON'T belong to the logged-in user
 */
export const getSwappableSlots = async (req, res) => {
  try {
    const slots = await Event.find({
      status: "SWAPPABLE",
      user: { $ne: req.user._id }
    }).populate("user", "name email");
    return res.json(slots);
  } catch (err) {
    console.error("getSwappableSlots error:", err);
    return res.status(500).json({ msg: "Server error fetching swappable slots" });
  }
};

/**
 * POST /api/swap-request
 * Body: { mySlotId, theirSlotId }
 * Creates a SwapRequest if both slots exist and are SWAPPABLE.
 * Sets both events to SWAP_PENDING to lock them.
 */
export const createSwapRequest = async (req, res) => {
  try {
    const { mySlotId, theirSlotId } = req.body;
    if (!mySlotId || !theirSlotId) return res.status(400).json({ msg: "mySlotId and theirSlotId required" });

    const mySlot = await Event.findById(mySlotId);
    const theirSlot = await Event.findById(theirSlotId);
    if (!mySlot || !theirSlot) return res.status(404).json({ msg: "One or both events not found" });

    // Must be owner of mySlot
    if (mySlot.user.toString() !== req.user._id.toString()) return res.status(403).json({ msg: "You don't own mySlot" });

    // Ensure both are SWAPPABLE
    if (mySlot.status !== "SWAPPABLE" || theirSlot.status !== "SWAPPABLE") {
      return res.status(400).json({ msg: "Both slots must be SWAPPABLE" });
    }

    // Create SwapRequest & update events atomically is nice, but simple sequence is ok here:
    const swap = new SwapRequest({
      requester: req.user._id,
      receiver: theirSlot.user,
      mySlot: mySlot._id,
      theirSlot: theirSlot._id,
      mySlotTitle: mySlot.title,
      theirSlotTitle: theirSlot.title,
      status: "PENDING"
    });

    // Save swap
    await swap.save();

    // Lock both events so others can't request them
    mySlot.status = "SWAP_PENDING";
    theirSlot.status = "SWAP_PENDING";
    await mySlot.save();
    await theirSlot.save();

    // Populate a bit for response
    const populated = await SwapRequest.findById(swap._id)
      .populate("requester", "name email")
      .populate("receiver", "name email");

    return res.status(201).json(populated);
  } catch (err) {
    console.error("createSwapRequest error:", err);
    return res.status(500).json({ msg: "Server error creating swap request" });
  }
};

/**
 * POST /api/swap-response/:requestId
 * Body: { accept: true/false }
 * Receiver responds. If accepted -> swap owners of events (atomic). If rejected -> unlock events.
 */
export const respondToSwap = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { requestId } = req.params;
    const { accept } = req.body;
    const swap = await SwapRequest.findById(requestId).session(session);
    if (!swap) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Swap request not found" });
    }
    if (swap.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ msg: "Swap request already handled" });
    }

    // Only receiver can respond
    if (swap.receiver.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({ msg: "Not authorized to respond to this request" });
    }

    const mySlot = await Event.findById(swap.mySlot).session(session);
    const theirSlot = await Event.findById(swap.theirSlot).session(session);
    if (!mySlot || !theirSlot) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ msg: "Related events not found" });
    }

    if (accept) {
      // Swap owners atomically: exchange user fields and set status BUSY
      const requesterId = swap.requester;
      const receiverId = swap.receiver;

      // Update events
      mySlot.user = receiverId;
      theirSlot.user = requesterId;
      mySlot.status = "BUSY";
      theirSlot.status = "BUSY";

      await mySlot.save({ session });
      await theirSlot.save({ session });

      swap.status = "ACCEPTED";
      await swap.save({ session });

      await session.commitTransaction();
      session.endSession();

      const populated = await SwapRequest.findById(swap._id)
        .populate("requester", "name email")
        .populate("receiver", "name email");
      return res.json({ msg: "Swap accepted", swap: populated });
    } else {
      // Reject: set status REJECTED and unlock events to SWAPPABLE
      mySlot.status = "SWAPPABLE";
      theirSlot.status = "SWAPPABLE";
      await mySlot.save({ session });
      await theirSlot.save({ session });

      swap.status = "REJECTED";
      await swap.save({ session });

      await session.commitTransaction();
      session.endSession();

      const populated = await SwapRequest.findById(swap._id)
        .populate("requester", "name email")
        .populate("receiver", "name email");
      return res.json({ msg: "Swap rejected", swap: populated });
    }
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("respondToSwap error:", err);
    return res.status(500).json({ msg: "Server error processing swap response" });
  }
};

/**
 * GET /api/requests
 * Return incoming and outgoing swap requests for the logged in user
 */
export const getRequestsForUser = async (req, res) => {
  try {
    const incoming = await SwapRequest.find({ receiver: req.user._id })
      .populate("requester", "name email")
      .populate("mySlot", "title startTime endTime status")
      .populate("theirSlot", "title startTime endTime status")
      .sort({ createdAt: -1 });

    const outgoing = await SwapRequest.find({ requester: req.user._id })
      .populate("receiver", "name email")
      .populate("mySlot", "title startTime endTime status")
      .populate("theirSlot", "title startTime endTime status")
      .sort({ createdAt: -1 });

    return res.json({ incoming, outgoing });
  } catch (err) {
    console.error("getRequestsForUser error:", err);
    return res.status(500).json({ msg: "Server error fetching requests" });
  }
};
