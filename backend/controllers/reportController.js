import mongoose from "mongoose";
import Report from "../models/Report.js";
import User from "../models/User.js";

export const createReport = async (req, res) => {
  try {
    const { reportedId, reason } = req.body;

    if (!req.user?._id) return res.status(401).json({ msg: "Not authenticated" });

    if (!reportedId || !mongoose.Types.ObjectId.isValid(reportedId)) {
      return res.status(400).json({ msg: "Invalid reportedId" });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ msg: "Report reason is required" });
    }

    if (req.user._id.toString() === reportedId) {
      return res.status(400).json({ msg: "You cannot report yourself" });
    }

    const reportedUser = await User.findById(reportedId);
    if (!reportedUser) return res.status(404).json({ msg: "Reported user not found" });

    const report = await Report.create({
      reporter: req.user._id,
      reported: reportedId,
      reason: reason.trim(), 
      decision: "pending" 
    });

    console.log("New report created:", report);
    res.json({ success: true, msg: "Report submitted", report });
  } catch (err) {
    console.error("Failed to create report:", err);
    res.status(500).json({ success: false, msg: "Failed to submit report" });
  }
};

export const getReports = async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 }).lean();
    const userIds = [
      ...new Set(reports.flatMap(r => [r.reporter.toString(), r.reported.toString()]))
    ];

    const users = await User.find({ _id: { $in: userIds } }, "email").lean();
    const userMap = {};
    users.forEach(u => userMap[u._id.toString()] = u.email);

    const reportsWithEmails = reports.map(r => ({
      ...r,
      reporter: userMap[r.reporter.toString()] || r.reporter,
      reported: userMap[r.reported.toString()] || r.reported
    }));

    res.json({ success: true, data: reportsWithEmails });
  } catch (err) {
    console.error("Failed to fetch reports:", err);
    res.status(500).json({ success: false, msg: "Failed to fetch reports" });
  }
};