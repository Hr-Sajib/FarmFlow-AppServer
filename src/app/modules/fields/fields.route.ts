import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { fieldController } from "./fields.controller";
import { FieldValidation } from "./fields.validation";

const router = express.Router();

/**
 * "/myFields" is declared before "/:fieldId" so it is not captured as a field id.
 */

// Admin only — listing every farm's fields.
router.get("/", auth("admin"), fieldController.readAllFields);

// Farmer only — their own fields.
router.get("/myFields", auth("farmer"), fieldController.readMyFields);

// Admin any field; farmer only their own (enforced in the service).
router.get("/:fieldId", auth("admin", "farmer"), fieldController.readFieldById);

// Admin must supply farmerId; a farmer is assigned as owner automatically.
router.post(
  "/",
  auth("admin", "farmer"),
  validateRequest(FieldValidation.createFieldValidationSchema),
  fieldController.addField
);

router.patch(
  "/:fieldId",
  auth("admin", "farmer"),
  validateRequest(FieldValidation.updateFieldValidationSchema),
  fieldController.updateField
);

router.delete("/:fieldId", auth("admin", "farmer"), fieldController.removeField);

// LLM-backed insights. Auth was previously commented out, leaving these open.
router.post(
  "/:fieldId/insights",
  auth("admin", "farmer"),
  fieldController.getFieldInsights
);
router.post(
  "/:fieldId/longInsights",
  auth("admin", "farmer"),
  fieldController.getFieldLongInsights
);

export const FieldRoutes = router;
