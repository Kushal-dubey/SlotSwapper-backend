// scripts/testModels.js
import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import SwapRequest from "../models/SwapRequest.js";

const run = async () => {
  try {
    // 1) Connect DB
    await connectDB();

    console.log("\n--- TEST: Models start ---");

    // 2) Create two test users
    const u1 = new User({ name: "TestA", email: "testa@example.com", password: "Password123" });
    const u2 = new User({ name: "TestB", email: "testb@example.com", password: "Password456" });

    await u1.save();
    await u2.save();
    console.log("Created users:", u1.email, u2.email);

    // 3) Verify password is hashed (the saved object has hashed password)
    const fetchedU1 = await User.findOne({ email: "testa@example.com" }).select("+password");
    console.log("Stored hash for TestA looks like:", fetchedU1.password?.slice(0, 20) + "...");

    // 4) Check matchPassword method
    const ok1 = await fetchedU1.matchPassword("Password123");
    const okWrong = await fetchedU1.matchPassword("WrongPass");
    console.log("Password correct?", ok1, "| Wrong password rejected?", !okWrong);

    // 5) Create events for each user
    const ev1 = new Event({
      title: "Team Meeting",
      startTime: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      endTime: new Date(Date.now() + 2 * 3600 * 1000), // 2 hours from now
      status: "SWAPPABLE",
      user: u1._id,
    });
    const ev2 = new Event({
      title: "Focus Block",
      startTime: new Date(Date.now() + 24 * 3600 * 1000), // tomorrow
      endTime: new Date(Date.now() + 24 * 3600 * 1000 + 3600 * 1000),
      status: "SWAPPABLE",
      user: u2._id,
    });

    await ev1.save();
    await ev2.save();
    console.log("Created events:", ev1.title, ev2.title);

    // 6) Create a swap request: u1 offers ev1 for ev2 (requester=u1, receiver=u2)
    const swap = new SwapRequest({
      requester: u1._id,
      receiver: u2._id,
      mySlot: ev1._id,
      theirSlot: ev2._id,
      status: "PENDING",
    });
    await swap.save();
    console.log("Created swap request id:", swap._id.toString());

    // 7) Populate and read back
    const populated = await SwapRequest.findById(swap._id)
      .populate("requester", "name email")
      .populate("receiver", "name email")
      .populate("mySlot")
      .populate("theirSlot");
    console.log("Populated swap request:", {
      requester: populated.requester,
      receiver: populated.receiver,
      mySlotTitle: populated.mySlot.title,
      theirSlotTitle: populated.theirSlot.title,
      status: populated.status,
    });

    // 8) Clean-up (delete test docs) — comment out if you want to inspect in Atlas
    await SwapRequest.deleteOne({ _id: swap._id });
    await Event.deleteMany({ _id: { $in: [ev1._id, ev2._id] } });
    await User.deleteMany({ _id: { $in: [u1._id, u2._id] } });

    console.log("\n--- TEST: Models passed (created → verified → cleaned) ---\n");

    // exit
    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
};

run();
