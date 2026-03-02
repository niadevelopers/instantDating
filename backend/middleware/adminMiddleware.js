import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

const adminAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  console.log("[ADMIN-MW] Request path:", req.path);
  console.log("[ADMIN-MW] Authorization header:", req.headers.authorization || "missing");

  if (!token) {
    console.log("[ADMIN-MW] No token → 401");
    return res.status(401).json({
      success: false,
      msg: "Admin token required"
    });
  }

  try {
    console.log("[ADMIN-MW] Verifying token...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("[ADMIN-MW] Token decoded successfully → payload:", JSON.stringify(decoded));

    console.log("[ADMIN-MW] Looking for admin with id:", decoded.id);
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      console.log("[ADMIN-MW] Admin document NOT FOUND for id:", decoded.id);
      console.log("[ADMIN-MW] Current database:", Admin.db?.name || "unknown");
      return res.status(403).json({
        success: false,
        msg: "Not admin"
      });
    }

    console.log("[ADMIN-MW] Admin found → _id:", admin._id.toString(), "email:", admin.email);

    req.admin = admin;

    next();
  } catch (err) {
    console.error("[ADMIN-MW] JWT verify failed:", err.name, err.message);
    return res.status(401).json({
      success: false,
      msg: "Invalid admin token",
      error: err.name === "TokenExpiredError" ? "Token expired" : "Token verification failed"
    });
  }
};

export default adminAuth;