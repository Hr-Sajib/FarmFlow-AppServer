import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { advisorySessionController } from "./advisorySession.controller";
import { AdvisorySessionValidation } from "./advisorySession.validation";

const router = express.Router();

// "/my-sessions" is declared before "/:sessionId" so it is not read as an id.

// Admin only — every session in the system.
router.get("/", auth("admin"), advisorySessionController.getAllSessions);

// Scoped to the caller: their own sessions as farmer, or the ones assigned to
// them as expert; an admin sees all.
router.get(
  "/my-sessions",
  auth("admin", "farmer", "expert"),
  advisorySessionController.getMySessions
);

// Farmers open sessions.
router.post(
  "/",
  auth("farmer"),
  validateRequest(AdvisorySessionValidation.createAdvisorySessionValidationSchema),
  advisorySessionController.createSession
);

// Only the farmer who opened it, and only the problem description.
router.patch(
  "/:sessionId",
  auth("farmer"),
  validateRequest(AdvisorySessionValidation.updateAdvisorySessionValidationSchema),
  advisorySessionController.updateSession
);

// Admin, or the farmer who opened the session.
router.patch(
  "/:sessionId/assign-expert",
  auth("admin", "farmer"),
  validateRequest(AdvisorySessionValidation.assignExpertValidationSchema),
  advisorySessionController.assignHumanExpert
);

router.delete(
  "/:sessionId",
  auth("admin"),
  advisorySessionController.softDeleteSession
);

export const AdvisorySessionRoutes = router;
