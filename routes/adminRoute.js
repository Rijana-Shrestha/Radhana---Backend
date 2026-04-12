import express from "express";
import adminController from "../controllers/adminController.js";
import roleBasedAuth from "../middlewares/roleBasedAuth.js";
import { ADMIN } from "../constants/roles.js";
import auth from "../middlewares/auth.js";

const router = express.Router();

// Admin: Get reports summary
// Route: GET /api/admin/reports/summary
router.get(
  "/reports/summary",
  auth,
  roleBasedAuth(ADMIN),
  adminController.getReportsSummary
);

export default router;
