import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import Report from "../models/Report.js";
import Subscription from "../models/Subscription.js";


export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

export const banUser = async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });

    user.banned = { status: true, reason: reason || "Banned by admin" };
    await user.save();

    res.json({ success: true, msg: "User banned successfully" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};


export const warnUser = async (req, res) => {
  try {
    const { userId, warning } = req.body;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ success: false, msg: "User not found" });
    if (!warning) return res.status(400).json({ success: false, msg: "Warning message required" });

    user.warnings.push({
      text: warning,
      issuedAt: new Date() 
    });

    await user.save();

    res.json({ success: true, msg: "Warning issued successfully" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};



export const upgradeSubscription = async (req, res) => {
  try {
    const { userId, plan } = req.body;
    if (!plan) return res.status(400).json({ success: false, msg: "Plan is required" });

    const sub = await Subscription.findOne({ user: userId });
    if (!sub) return res.status(404).json({ success: false, msg: "Subscription not found" });

    sub.plan = plan;
    await sub.save();

    await User.findByIdAndUpdate(userId, { tier: plan });

    res.json({ success: true, msg: `Subscription upgraded to ${plan}` });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};


export const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json({ success: true, data: reports });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

export const validateReport = async (req, res) => {
  try {
    const { reportId, action } = req.body;
    if (!action) return res.status(400).json({ success: false, msg: "Action is required" });

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ success: false, msg: "Report not found" });

    report.decision = action;
    await report.save();

    if (action === "ban") {
      const user = await User.findById(report.reported);
      if (user) {
        user.banned = { status: true, reason: "Banned via report validation" };
        await user.save();
      }
    }

    res.json({ success: true, msg: `Report ${action}ed successfully` });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};


export const matchUser = async (req, res) => {
  try {
    const { userId } = req.body;
    const requester = await User.findById(userId);
    if (!requester) return res.status(404).json({ success: false, msg: "User not found" });

    const match = await User.findOne({
      _id: { $ne: userId },
      intentions: requester.intentions,
      "banned.status": false
    }).sort({ createdAt: -1 });

    if (!match) {
      return res.json({ success: true, msg: "No matching user found", matchedUser: null });
    }

    res.json({ success: true, matchedUser: match });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};


export const registerAdmin = async (req, res) => {
  try {
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(403).json({ success: false, msg: "Admin already exists. Registration locked." });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email and password required" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = await Admin.create({ email, password: hashed });

    res.json({ success: true, msg: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, msg: "Admin not found" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      admin: { email: admin.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, msg: err.message });
  }
};