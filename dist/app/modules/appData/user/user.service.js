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
exports.userServices = void 0;
const AppError_1 = __importDefault(require("../../../errors/AppError"));
const user_model_1 = require("./user.model");
const http_status_1 = __importDefault(require("http-status"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const generateIds_1 = require("../../../utils/generateIds");
const config_1 = __importDefault(require("../../../../config"));
// Create a new user in the database
const createUserIntoDB = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const farmerId = yield (0, generateIds_1.generateFarmerId)();
    const insertingData = Object.assign(Object.assign({}, payload), { farmerId });
    const newUser = yield user_model_1.UserModel.create(insertingData);
    if (!newUser) {
        throw new AppError_1.default(400, "Failed to create user!");
    }
    return newUser;
});
const getAllUsersFromDB = () => __awaiter(void 0, void 0, void 0, function* () {
    const allUsers = yield user_model_1.UserModel.find({ role: 'farmer' });
    if (!allUsers) {
        throw new AppError_1.default(400, "Failed to fetch users!");
    }
    return allUsers;
});
const getUserByIdFromDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findById(userId);
    if (!user) {
        throw new AppError_1.default(400, "Failed to fetch user!");
    }
    return user;
});
const getMeFromDB = (userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone });
    if (!user) {
        throw new AppError_1.default(400, "Failed to fetch user!");
    }
    return user;
});
// Toggle user status between active and blocked
const toggleUserStatus = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findById(userId);
    if (!user) {
        throw new AppError_1.default(404, "User not found!");
    }
    const newStatus = user.status === "active" ? "blocked" : "active";
    const updatedUser = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $set: { status: newStatus } }, { new: true });
    if (!updatedUser) {
        throw new AppError_1.default(500, "Failed to update user status!");
    }
    return updatedUser;
});
// Update user data
const updateUserData = (role, userId, userPhone, updates) => __awaiter(void 0, void 0, void 0, function* () {
    // Find the target user by userId
    const userData = yield user_model_1.UserModel.findById(userId);
    if (!userData) {
        throw new AppError_1.default(404, "User not found!");
    }
    if (role !== "admin" && userData.phone !== userPhone) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: Parameter ID and login access token do not match!");
    }
    // Prepare update object for $set
    const updateFields = {};
    if (updates.name)
        updateFields.name = updates.name;
    if (updates.email)
        updateFields.email = updates.email;
    if (updates.address)
        updateFields.address = updates.address;
    if (updates.photo)
        updateFields.photo = updates.photo;
    if (updates.status)
        updateFields.status = updates.status;
    if (updates.password && role == 'admin')
        updateFields.password = yield bcrypt_1.default.hash(updates.password, Number(config_1.default.bcrypt_salt_rounds));
    ;
    const updatedUser = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $set: updateFields }, { new: true });
    if (!updatedUser) {
        throw new AppError_1.default(500, "Failed to update user data!");
    }
    return updatedUser;
});
// Update user password
const updateUserPassword = (userId, userPhone, role, oldPassword, newPassword) => __awaiter(void 0, void 0, void 0, function* () {
    // Find the target user by userId
    const userData = yield user_model_1.UserModel.findById(userId).select("+password");
    if (!userData) {
        throw new AppError_1.default(404, "User not found!");
    }
    // Skip old password check and phone check if role is admin
    if (role !== "admin") {
        if (userData.phone !== userPhone) {
            throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: Parameter ID and login access token do not match!");
        }
        if (!oldPassword) {
            throw new AppError_1.default(400, "Old password is required!");
        }
        const isOldPasswordCorrect = yield bcrypt_1.default.compare(oldPassword, userData.password);
        if (!isOldPasswordCorrect) {
            throw new AppError_1.default(401, "Old password is incorrect!");
        }
    }
    // Hash the new password
    const hashedPassword = yield bcrypt_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    // Update password and passwordChangedAt using $set
    const updatedUser = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $set: { password: hashedPassword, passwordChangedAt: new Date() } }, { new: true, select: "-password" });
    if (!updatedUser) {
        throw new AppError_1.default(500, "Failed to update password!");
    }
    return updatedUser;
});
const softDeleteUserInDB = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findById(userId).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(404, "User not found!");
    }
    const updatedUser = yield user_model_1.UserModel.findByIdAndUpdate(userId, { $set: { isDeleted: true } }, { new: true });
    if (!updatedUser) {
        throw new AppError_1.default(500, "Failed to delete user!");
    }
    return updatedUser;
});
exports.userServices = {
    createUserIntoDB,
    toggleUserStatus,
    updateUserData,
    updateUserPassword,
    softDeleteUserInDB,
    getAllUsersFromDB,
    getUserByIdFromDB,
    getMeFromDB
};
