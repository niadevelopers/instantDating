import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  transactionId: {         
    type: String,
    unique: true,
    sparse: true,
  },
  paymentReference: String, 
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
  },
  amount: {
    type: Number,
    required: true,
  },
  plan: String,             
  gateway: {
    type: String,
    default: "pesaflux",
  },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }, 
},
{ timestamps: true });

export default mongoose.model("Payment", paymentSchema);