import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { generateToken } from "../utils/token.js";
import { validateEmail, validatePhone } from "../utils/validators.js";


export const registerUser = async (req, res) => {
  try {
    const {
      gender,
      whatsapp,
      email,
      password,
      location,
      intentions,
      age
    } = req.body;

    if (!gender || !whatsapp || !email || !password || !location || !intentions) {
      return res.status(400).json({ success: false, msg: "All required fields must be provided" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ success: false, msg: "Invalid email format" });
    }

    if (!validatePhone(whatsapp)) {
      return res.status(400).json({ success: false, msg: "Invalid WhatsApp number" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ success: false, msg: "User with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      gender,
      whatsapp,
      email,
      password: hashed,
      location,
      intentions,
      age: age || null,
    });

    const token = generateToken(user._id, "user");

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        gender: user.gender,
        whatsapp: user.whatsapp,
        location: user.location,
        intentions: user.intentions,
        age: user.age,
        role: user.role || "user",
      },
    });
  } catch (err) {
    console.error("registerUser error:", err);
    res.status(500).json({ success: false, msg: "Server error during registration" });
  }
};


export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, msg: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    if (user.banned?.status) {
      return res.status(403).json({
        success: false,
        msg: "Account banned",
        reason: user.banned.reason || "No reason provided",
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }

    const token = generateToken(user._id, user.role || "user");

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role || "user",
        banned: user.banned,
      },
    });
  } catch (err) {
    console.error("loginUser error:", err);
    res.status(500).json({ success: false, msg: "Server error during login" });
  }
};