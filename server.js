import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import eventRoutes from "./routes/eventRoutes.js";
import swapRoutes from "./routes/swapRoutes.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";

dotenv.config();
await connectDB(); // connect DB (if your connectDB is sync/async, keep as you implemented)

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Root route (Fixes 'Cannot GET /')
app.get("/", (req, res) => {
  res.send("<h2>🚀 SlotSwapper API is live and running successfully!</h2>");
});


// quick logger to see incoming requests (temporary)
app.use((req, res, next) => {
  console.log("➡", req.method, req.path);
  next();
});

// mount routes (order matters)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/swaps", swapRoutes);

// LIST ROUTES (debug) - temporary, safe
setTimeout(() => {
  if (app._router) {
    app._router.stack.forEach(mw => {
      if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods).join(",").toUpperCase();
        console.log("Route:", methods, mw.route.path);
      } else if (mw.name === "router") {
        mw.handle.stack.forEach(r => {
          if (r.route) {
            const methods = Object.keys(r.route.methods).join(",").toUpperCase();
            console.log("Route:", methods, r.route.path);
          }
        });
      }
    });
  }
}, 1000);

const PORT = process.env.PORT || 5000;
console.log("✅ Loaded Routes: /api/users, /api/events, /api/swaps");

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
