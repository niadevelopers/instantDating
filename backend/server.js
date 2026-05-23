import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

import rateLimiter from "./middleware/rateLimiter.js";

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'X-Skip-Publisher-Verification'],
  credentials: true
}));

app.use(express.json());


// ============================================
// SERVER WAKE & HEALTH ENDPOINTS
// Add this to your existing server.js file
// ============================================

// Lightweight health check - NO database queries
app.head('/health-check', (req, res) => {
  res.set({
    'X-Server-Status': 'ready',
    'Cache-Control': 'no-store, no-cache',
    'Connection': 'close'
  });
  res.status(200).end();
});

app.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Wake endpoint - for waking up from spin-down
app.head('/wakeup', (req, res) => {
  res.set({
    'X-Wake-Complete': 'true',
    'Cache-Control': 'no-store',
    'Connection': 'close'
  });
  res.status(200).end();
});

app.get('/wakeup', (req, res) => {
  res.status(200).send('OK');
});

// Optional: Keep MongoDB connection alive if you're using Mongoose
if (typeof mongoose !== 'undefined' && mongoose.connection) {
  setInterval(async () => {
    try {
      await mongoose.connection.db.admin().ping();
      console.log('[DB] Keep-alive ping sent');
    } catch (err) {
      console.log('[DB] Ping failed, will reconnect on next request');
    }
  }, 60000); // Every minute
}


app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reports", reportRoutes);

app.use((req, res, next) => {
  res.set("Cache-Control", "private, max-age=3600"); 
  next();
});

app.listen(process.env.PORT, () =>
  console.log(`Server running on ${process.env.PORT}`)
);
