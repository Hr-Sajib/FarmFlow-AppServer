import express from "express";
import auth from "../../../middlewares/auth";
import { fieldController } from "./fields.controller";

const router = express.Router();

// Add a new field
router.post("/", auth("admin", "farmer"), fieldController.addField);

// Soft delete a field
router.delete("/:fieldId", auth("admin", "farmer"), fieldController.removeField);

// Update a field
router.patch("/:fieldId", auth("admin", "farmer"), fieldController.updateField);

// Read all fields
router.get("/", auth("admin", "farmer"), fieldController.readAllFields);

// Read all fields
router.get("/myFields", auth("admin", "farmer"), fieldController.readMyFields);

// Read a specific field by fieldId
router.get("/:fieldId", auth("admin", "farmer"), fieldController.readFieldById);

export const FieldRoutes = router;