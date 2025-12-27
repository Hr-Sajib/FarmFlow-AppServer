"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldModel = void 0;
const mongoose_1 = require("mongoose");
// Define the Field Location sub-schema
const fieldLocationSchema = new mongoose_1.Schema({
    latitude: {
        type: Number,
        required: [true, "Latitude is required"],
    },
    longitude: {
        type: Number,
        required: [true, "Longitude is required"],
    },
}, { _id: false });
// Define the Field schema
const fieldSchema = new mongoose_1.Schema({
    fieldId: {
        type: String,
        required: [true, "Field ID is required"],
        unique: true,
        trim: true,
    },
    fieldName: {
        type: String,
        required: [true, "Field name is required"],
        trim: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    fieldImage: {
        type: String,
        required: [true, "Field image URL is required"],
        trim: true,
    },
    fieldCrop: {
        type: String,
        required: [true, "Field crop is required"],
        trim: true,
    },
    fieldLocation: {
        type: fieldLocationSchema,
        required: [true, "Field location is required"],
    },
    fieldSizeInAcres: {
        type: Number,
        min: [0, "Field size cannot be negative"],
    },
    soilType: {
        type: String,
        enum: {
            values: ["clay", "loam", "sandy", "silt", "peat", "chalk", "saline"],
            message: "Soil type must be one of: clay, loam, sandy, silt, peat, chalk, saline",
        },
    },
    farmerId: {
        type: String,
        required: [true, "Farmer ID is required"],
        ref: "User",
        trim: true,
    },
    region: {
        type: String,
        trim: true,
    },
    fieldStatus: {
        type: String,
        enum: {
            values: ["active", "inactive", "maintenance"],
            message: "Field status must be one of: active, inactive, maintenance",
        },
        default: "active",
    },
    motorOn: {
        type: mongoose_1.Schema.Types.Boolean,
    },
    shadeOn: {
        type: mongoose_1.Schema.Types.Boolean,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});
// Update updatedAt on save
fieldSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});
// Export the Mongoose model
exports.FieldModel = (0, mongoose_1.model)("Field", fieldSchema);
