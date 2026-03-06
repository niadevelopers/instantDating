import axios from "axios";
import User from "../models/User.js";

const PESAFLUX_BASE_URL = "https://api.pesaflux.co.ke/v1";
const VERIF_AMOUNT = 1;
const VERIF_REFERENCE_PREFIX = "verif_"; 

function normalizePhone(phone) {
  let msisdn = phone.trim().replace(/\s/g, '');
  if (msisdn.startsWith('0')) {
    msisdn = '254' + msisdn.slice(1);
  } else if (msisdn.startsWith('+254')) {
    msisdn = msisdn.slice(1);
  } else if (!msisdn.startsWith('254')) {
    throw new Error("Invalid Kenyan phone number format");
  }
  return msisdn;
}

export const initiateVerificationPayment = async (req, res) => {
  try {
    const user = req.user; 
    if (!user) return res.status(401).json({ msg: "Not authenticated" });

    if (user.hasPaidVerificationFee) {
      return res.status(200).json({
        msg: "You have already completed the verification payment",
        alreadyPaid: true
      });
    }

    const { phone } = req.body;
    if (!phone) return res.status(400).json({ msg: "Phone number is required" });

    const msisdn = normalizePhone(phone);

    const reference = user._id.toString();

    const payload = {
      api_key: process.env.PESAFLUX_API_KEY,
      email: process.env.PESAFLUX_EMAIL,
      amount: VERIF_AMOUNT.toString(),
      msisdn,
      reference,             
    };

    if (!process.env.PESAFLUX_API_KEY || !process.env.PESAFLUX_EMAIL) {
      throw new Error("Pesaflux credentials missing in .env");
    }

    console.log("[VERIF] Initiate payload:", payload);

    const response = await axios.post(
      `${PESAFLUX_BASE_URL}/initiatestk`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("[VERIF] Initiate response:", response.data);

    if (response.data.success !== "200") {
      throw new Error(response.data.massage || "STK push initiation failed");
    }

   

    res.json({
      msg: "STK push sent — check your phone and complete the 20 KES payment",
      reference, 
    });
  } catch (err) {
    console.error("[VERIF] Initiate error:", err.message, err.response?.data);
    res.status(500).json({
      msg: "Could not start verification payment",
      error: err.message
    });
  }
};

export const verificationWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log("[VERIF WEBHOOK] Received:", body);

    let reference = body.reference || body.TransactionReference;
    if (!reference) {
      console.warn("[VERIF] No reference in webhook → ignoring");
      return res.sendStatus(200);
    }

    const user = await User.findById(reference);
    if (!user) {
      console.warn("[VERIF] User not found for reference:", reference);
      return res.sendStatus(200);
    }

    // Idempotency — already paid? just ack
    if (user.hasPaidVerificationFee) {
      console.log("[VERIF] Already paid → skipping update", user._id);
      return res.sendStatus(200);
    }

    const responseCode = Number(body.ResponseCode ?? -1);

    if (responseCode === 0) {

      user.hasPaidVerificationFee = true;
      user.verificationPaidAt = new Date();
      user.verificationPayment = {
        reference,
        phone: body.msisdn || body.phone || "unknown",
        amount: VERIF_AMOUNT,
        receipt: body.TransactionReceipt || body.mpesa_receipt || "no-receipt",
        webhookBody: body,
        completedAt: new Date()
      };

      await user.save();

      console.log("[VERIF] User marked as verified/paid:", user._id.toString());
    } else {
      console.log("[VERIF] Payment failed or not completed:", {
        user: user._id.toString(),
        code: responseCode,
        desc: body.ResponseDescription
      });
      
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("[VERIF WEBHOOK] Error:", err.message);
    res.sendStatus(200); 
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ msg: "Not authenticated" });

    res.json({
      hasPaidVerificationFee: user.hasPaidVerificationFee,
      verificationPaidAt: user.verificationPaidAt,
    });
  } catch (err) {
    res.status(500).json({ msg: "Status check failed", error: err.message });
  }
};
