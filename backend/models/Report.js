 import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",   
    required: true
  },
  reported: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",   
    required: true
  },
  reason: { type: String, required: true },
  decision: { 
    type: String, 
    enum: ["pending","reviewed","ignored","action_taken"], 
    default: "pending" 
  }
}, { timestamps: true });

export default mongoose.model("Report", reportSchema);