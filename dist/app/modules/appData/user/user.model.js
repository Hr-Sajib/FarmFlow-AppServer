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
exports.UserModel = void 0;
const mongoose_1 = require("mongoose");
const bcrypt_1 = __importDefault(require("bcrypt"));
const index_1 = __importDefault(require("../../../../config/index"));
// Define the User schema
const userSchema = new mongoose_1.Schema({
    name: { type: String, trim: true, required: [true, "Name is required"] },
    farmerId: { type: String, trim: true, required: [true, "Farmer ID is required"] },
    email: { type: String, lowercase: true, trim: true },
    phone: {
        type: String,
        trim: true,
        required: [true, "Phone number is required"],
        unique: [true, "Phone number is already in use, please provide a unique number!"],
    },
    password: { type: String, required: [true, "Password is required"], select: false },
    photo: { type: String, trim: true },
    address: { type: String, trim: true, required: [true, "Address is required"] },
    passwordChangedAt: { type: Date, default: null },
    role: {
        type: String,
        enum: {
            values: ["admin", "farmer"],
            message: "Role must be either 'admin' or 'farmer'",
        },
        default: "farmer",
    },
    status: {
        type: String,
        enum: {
            values: ["active", "blocked"],
            message: "Status must be either 'active' or 'blocked'",
        },
        default: "active",
    },
    fieldIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Field" }],
    isDeleted: { type: Boolean, default: false },
}, {
    timestamps: true,
});
// Password hashing middleware
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        const user = this;
        if (user.isModified("password")) {
            user.password = yield bcrypt_1.default.hash(user.password, Number(index_1.default.bcrypt_salt_rounds));
        }
        next();
    });
});
// Export the Mongoose model
exports.UserModel = (0, mongoose_1.model)("User", userSchema);
