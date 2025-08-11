import express from "express";
import auth from "../../../middlewares/auth";
import { fieldController } from "./fields.controller";

const router = express.Router();

// Get AI-generated insights for a specific field
router.post("/fields/:fieldId/insights",
    //  auth("admin", "farmer"), 
     fieldController.getFieldInsights);

// Add a new field
router.post("/", auth("admin", "farmer"), fieldController.addField);

// Soft delete a field
router.delete("/:fieldId", auth("admin", "farmer"), fieldController.removeField);

// Update a field
router.patch("/:fieldId", auth("admin", "farmer"), fieldController.updateField);


// Get all fields (admin-only or all fields for the system)
router.get("/", auth("admin", "farmer"), fieldController.readAllFields);

// Get fields owned by the authenticated user
router.get("/myFields", auth("admin", "farmer"), fieldController.readMyFields);

// Get a specific field by fieldId
router.get("/:fieldId", auth("admin", "farmer"), fieldController.readFieldById);

export const FieldRoutes = router;