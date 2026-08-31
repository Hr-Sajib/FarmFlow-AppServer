import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { fieldController } from "./fields.controller";
import { FieldValidation } from "./fields.validation";

const router = express.Router();

// "/myFields" is declared before "/:fieldId" so it is not captured as a field id.

// Admin only — listing every farm's fields.
router.get("/", auth("admin"), fieldController.getAllFields);

// Farmer only — their own fields.
router.get("/myFields", auth("farmer"), fieldController.getMyFields);

// Admin any field; farmer only their own (enforced in the service).
router.get("/:fieldId", auth("admin", "farmer"), fieldController.getFieldById);

// Admin must supply farmerId; a farmer is assigned as owner automatically.
router.post(
  "/",
  auth("admin", "farmer"),
  validateRequest(FieldValidation.createFieldValidationSchema),
  fieldController.createField
);

router.patch(
  "/:fieldId",
  auth("admin", "farmer"),
  validateRequest(FieldValidation.updateFieldValidationSchema),
  fieldController.updateField
);

router.delete("/:fieldId", auth("admin", "farmer"), fieldController.softDeleteField);

// Current conditions and 7-day forecast for the field's coordinates.
router.get(
  "/:fieldId/weather",
  auth("admin", "farmer"),
  fieldController.getFieldWeather
);

/* ---------------------------------------------------------------------------
 * DISABLED: AI insight endpoints.
 * -------------------------------------------------------------------------*/
// router.post(
//   "/:fieldId/insights",
//   auth("admin", "farmer"),
//   fieldController.getFieldInsights
// );
// router.post(
//   "/:fieldId/longInsights",
//   auth("admin", "farmer"),
//   fieldController.getFieldLongInsights
// );

export const FieldRoutes = router;
