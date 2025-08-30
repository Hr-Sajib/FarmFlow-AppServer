"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("../../../middlewares/auth"));
const fields_controller_1 = require("./fields.controller");
const router = express_1.default.Router();
// Get AI-generated insights for a specific field
router.post("/fields/:fieldId/insights", 
//  auth("admin", "farmer"), 
fields_controller_1.fieldController.getFieldInsights);
router.post("/fields/:fieldId/longInsights", 
//  auth("admin", "farmer"), 
fields_controller_1.fieldController.getFieldLongInsights);
// Add a new field
router.post("/", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.addField);
// Soft delete a field
router.delete("/:fieldId", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.removeField);
// Update a field
router.patch("/:fieldId", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.updateField);
// Get all fields (admin-only or all fields for the system)
router.get("/", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.readAllFields);
// Get fields owned by the authenticated user
router.get("/myFields", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.readMyFields);
// Get a specific field by fieldId
router.get("/:fieldId", (0, auth_1.default)("admin", "farmer"), fields_controller_1.fieldController.readFieldById);
exports.FieldRoutes = router;
