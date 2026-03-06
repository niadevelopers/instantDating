import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  gender: String,
  whatsapp: String,
  email: { type: String, unique: true },
  password: String,
  location: String,
  intentions: String,
  age: Number,

  role: {
    type: String,
    default: "user"
  },

  lastProfileImageUpdated: {
  type: Date,
  default: null
},

  tier: {
    type: String,
    default: "Normal"
  },

  profileImage: String,
  gallery: [String],

  stats: {
    clicksToday: { type: Number, default: 0 },
    clicksWeek: { type: Number, default: 0 },
    clicksMonth: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 }
  },


warnings: [
  {
    text: String,
    issuedAt: { type: Date, default: Date.now }
  }
],

  banned: {
    status: { type: Boolean, default: false },
    reason: String
  },
  
  // models/User.js  — add at the end of the schema, before }, { timestamps: true }

  // ─── One-time 20 KES genuine user verification ──────────────────────────────
  hasPaidVerificationFee: {
    type: Boolean,
    default: false
  },
  verificationPaidAt: {
    type: Date,
    default: null
  },
  verificationPayment: {
    type: {
      reference: String,         // = user._id.toString() we sent
      phone: String,
      amount: Number,
      receipt: String,           // mpesa_receipt or TransactionReceipt
      webhookBody: mongoose.Schema.Types.Mixed,
      completedAt: Date
    },
    default: null
  }
  // ────────────────────────────────────────────────────────────────────────────

},
{ timestamps: true });


export default mongoose.model("User", userSchema);
