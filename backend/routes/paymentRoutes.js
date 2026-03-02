import express from "express";
import auth from "../middleware/authMiddleware.js";

import {
  initiatePayment,
  paymentCallback,
  getPaymentStatus,
} from "../controllers/paymentController.js";

const router = express.Router();


router.post("/stk", auth, initiatePayment);


router.post("/callback", paymentCallback);

router.get("/status/:paymentId", auth, getPaymentStatus);

export default router;