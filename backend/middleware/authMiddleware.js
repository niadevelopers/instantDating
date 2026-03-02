import jwt from "jsonwebtoken";
import User from "../models/User.js";

export default async (req, res, next) => {
  try {

    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ msg: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ msg: "User missing" });

    if (user.banned.status)
      return res.status(403).json({
        msg: "Banned",
        reason: user.banned.reason
      });

    req.user = user;
    next();

  } catch {
    res.status(401).json({ msg: "Unauthorized" });
  }
};