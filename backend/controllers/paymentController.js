import axios from "axios";
import Subscription from "../models/Subscription.js";
import Payment from "../models/Payment.js";
import User from "../models/User.js";
import { PLANS } from "../utils/plans.js";

const PESAFLUX_BASE_URL = "https://api.pesaflux.co.ke/v1";


export const initiatePayment = async (req, res) => {
  try {
    const { plan, phone } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ msg: "Invalid plan" });
    }

    const amount = PLANS[plan].amount;

    const payment = await Payment.create({
      user: req.user._id,
      amount,
      plan,
      status: "pending",
      gateway: "pesaflux",
    });

    let msisdn = phone.trim().replace(/\s/g, '');
    if (msisdn.startsWith('0')) {
      msisdn = '254' + msisdn.slice(1);
    } else if (msisdn.startsWith('+254')) {
      msisdn = msisdn.slice(1);
    } else if (!msisdn.startsWith('254')) {
      return res.status(400).json({ msg: "Invalid Kenyan phone number" });
    }

    const payload = {
      api_key: process.env.PESAFLUX_API_KEY,
      email: process.env.PESAFLUX_EMAIL,
      amount: amount.toString(),
      msisdn,
      reference: payment._id.toString(),
    };

    if (!process.env.PESAFLUX_API_KEY) {
      throw new Error("PESAFLUX_API_KEY missing in .env");
    }


    const response = await axios.post(
      `${PESAFLUX_BASE_URL}/initiatestk`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );


    if (response.data.success !== "200") {
      throw new Error(response.data.massage || "STK initiation failed");
    }

    payment.transactionId = response.data.transaction_request_id || response.data.CheckoutRequestID;
    payment.metadata = { 
      initiateResponse: response.data,
      checkoutRequestID: response.data.CheckoutRequestID,
      merchantRequestID: response.data.MerchantRequestID,
      sentReference: payment._id.toString() 
    };
    await payment.save();

    res.json({
      msg: "STK push sent – check your phone",
      paymentId: payment._id.toString(),
    });
  } catch (err) {
    console.error("Initiate error:", err.response?.data || err.message);
    res.status(500).json({ msg: "Payment initiation failed", error: err.message });
  }
};


export const paymentCallback = async (req, res) => {
  try {
    const body = req.body;
    let payment = null;
    if (body.TransactionReference) {
      payment = await Payment.findById(body.TransactionReference);
      if (payment) {
      }
    }

    if (!payment && body.CheckoutRequestID) {
      payment = await Payment.findOne({
        $or: [
          { transactionId: body.CheckoutRequestID },
          { 'metadata.checkoutRequestID': body.CheckoutRequestID }
        ]
      });
      if (payment) {
      }
    }

    if (!payment && body.MerchantRequestID) {
      payment = await Payment.findOne({
        'metadata.merchantRequestID': body.MerchantRequestID
      });
      if (payment) {
      }
    }

    if (!payment && body.reference) {
      payment = await Payment.findById(body.reference);
      if (payment) {
      }
    }

    if (!payment) {
      console.warn('PAYMENT NOT FOUND');
      console.warn('Tried keys:', {
        TransactionReference: body.TransactionReference,
        CheckoutRequestID: body.CheckoutRequestID,
        MerchantRequestID: body.MerchantRequestID,
        reference: body.reference
      });
      return res.sendStatus(200);
    }

    const responseCode = Number(body.ResponseCode ?? -1);

    if (responseCode === 0) {
      payment.status = "completed";
      payment.paymentReference = body.TransactionReceipt || body.mpesa_receipt || 'no-receipt-provided';
      payment.transactionId = body.TransactionID || body.CheckoutRequestID || payment.transactionId;
      payment.metadata = { ...payment.metadata, webhook: body, webhookReceivedAt: new Date() };
      await payment.save();


      const config = PLANS[payment.plan];
      if (!config) {
        console.error('Plan config not found:', payment.plan);
      } else {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + config.durationDays);

        const updatedSub = await Subscription.findOneAndUpdate(
          { user: payment.user },
          {
            plan: payment.plan,
            expiry,
            status: "active",
            usage: { daily: 0, weekly: 0 },
            lastPayment: payment._id,
          },
          { upsert: true, new: true }
        );

        await User.findByIdAndUpdate(payment.user, { tier: payment.plan });

      }
    } else {
      payment.status = "failed";
      payment.metadata = { ...payment.metadata, webhook: body, webhookReceivedAt: new Date() };
      await payment.save();
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('WEBHOOK PROCESSING ERROR:', {
      message: err.message,
      stack: err.stack?.substring(0, 300) + '...'
    });
    res.sendStatus(200); 
  }
};


export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ msg: "Payment not found" });
    }

    if (payment.transactionId) {
      const statusRes = await axios.post(
        `${PESAFLUX_BASE_URL}/transactionstatus`,
        {
          api_key: process.env.PESAFLUX_API_KEY,
          email: process.env.PESAFLUX_EMAIL || req.user.email || "pesafluxsandbox@gmail.com", // ← REQUIRED! Use .env or fallback
          transaction_request_id: payment.transactionId,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = statusRes.data;

      
      if (data && data.ResultCode === "200" && (data.TransactionCode === "0" || data.TransactionStatus === "Completed")) {
        if (payment.status !== "completed") { 
          payment.status = "completed";
          payment.paymentReference = data.TransactionReceipt || payment.paymentReference;
          payment.metadata = { ...payment.metadata, statusCheck: data, polledAt: new Date() };
          await payment.save();

          const config = PLANS[payment.plan];
          if (config) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + config.durationDays);

            await Subscription.findOneAndUpdate(
              { user: payment.user },
              {
                plan: payment.plan,
                expiry,
                status: "active",
                usage: { daily: 0, weekly: 0 },
                lastPayment: payment._id,
              },
              { upsert: true }
            );

            await User.findByIdAndUpdate(payment.user, { tier: payment.plan });

          }
        }
      } else {
      }
    } else {
    }

    res.json({
      status: payment.status,
      plan: payment.plan,
      amount: payment.amount,
      paymentReference: payment.paymentReference,
    });
  } catch (err) {
    console.error("Status check error for", req.params.paymentId, ":", err.message);
    if (err.response) {
      console.error("PesaFlux error response:", err.response.data);
    }
    res.status(500).json({ msg: "Status check failed", error: err.message });
  }
};
