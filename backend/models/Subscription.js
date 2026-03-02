import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  plan: {
    type: String,
    required: true,
  },
  expiry: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "expired", "cancelled", "pending", "grace"],
    default: "pending",
  },
  usage: {
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
  },
  lastPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Payment",
  },
},
{ timestamps: true });

export default mongoose.model("Subscription", subscriptionSchema);