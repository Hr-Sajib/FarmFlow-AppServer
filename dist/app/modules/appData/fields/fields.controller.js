"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldController = void 0;
const catchAsync_1 = __importDefault(require("../../../utils/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../utils/sendResponse"));
const http_status_1 = __importDefault(require("http-status"));
const AppError_1 = __importDefault(require("../../../errors/AppError"));
const fields_service_1 = require("./fields.service");
// Add a new field
const addField = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    // Validate request body using Zod schema
    const fieldData = req.body;
    const userPhone = req.user.userPhone;
    const newField = yield fields_service_1.fieldServices.addField(fieldData, userPhone, (_a = req === null || req === void 0 ? void 0 : req.user) === null || _a === void 0 ? void 0 : _a.role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Field created successfully",
        data: newField,
    });
}));
// Soft delete a field
const removeField = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fieldId } = req.params;
    const userPhone = req.user.userPhone;
    const role = req.user.role;
    const deletedField = yield fields_service_1.fieldServices.removeField(fieldId, userPhone, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Field deleted successfully",
        data: deletedField,
    });
}));
// Update a field
const updateField = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fieldId } = req.params;
    const fieldData = req.body;
    const userPhone = req.user.userPhone;
    const role = req.user.role;
    const updatedField = yield fields_service_1.fieldServices.updateField(fieldId, fieldData, userPhone, role);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Field updated successfully",
        data: updatedField,
    });
}));
// Read all fields
const readAllFields = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const fields = yield fields_service_1.fieldServices.readAllFields();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Fields retrieved successfully",
        data: fields,
    });
}));
// Read all fields
const readMyFields = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const fields = yield fields_service_1.fieldServices.readMyFieldsFromDB((_a = req.user) === null || _a === void 0 ? void 0 : _a.userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Your Fields retrieved successfully",
        data: fields,
    });
}));
// Read a specific field by fieldId
const readFieldById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { fieldId } = req.params;
    const field = yield fields_service_1.fieldServices.readFieldById(fieldId);
    if (!field) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Field not found!");
    }
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Field retrieved successfully",
        data: field,
    });
}));
const getFieldInsights = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const fieldInfo = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.data;
    const insights = yield fields_service_1.fieldServices.loadInsightsFromFieldData(fieldInfo);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Field insights generated successfully',
        data: { insights },
    });
}));
const getFieldLongInsights = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const fieldInfo = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.data;
    const insights = yield fields_service_1.fieldServices.loadLongInsightsFromFieldData(fieldInfo);
    (0, sendResponse_1.default)(res, {
        success: true,
        statusCode: http_status_1.default.OK,
        message: 'Field long insights generated successfully',
        data: { insights },
    });
}));
exports.fieldController = {
    addField,
    removeField,
    updateField,
    readAllFields,
    readFieldById,
    readMyFields,
    getFieldInsights,
    getFieldLongInsights
};
