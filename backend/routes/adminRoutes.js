import express from "express";
import adminAuth from "../middleware/adminMiddleware.js";

import {
  registerAdmin,
  loginAdmin,
  getAllUsers,
  banUser,
  warnUser,
  upgradeSubscription,
  getReports,
  validateReport,
  getUser,
  matchUser
} from "../controllers/adminController.js";

const router = express.Router();


router.post("/register", registerAdmin);
router.post("/login", loginAdmin);


router.use(adminAuth); 

router.get("/users", getAllUsers);
router.get("/user/:id", getUser);

router.post("/ban", banUser);
router.post("/warn", warnUser);
router.post("/upgrade", upgradeSubscription);

router.get("/reports", getReports);
router.post("/validate", validateReport);

router.post("/match", matchUser);

export default router;