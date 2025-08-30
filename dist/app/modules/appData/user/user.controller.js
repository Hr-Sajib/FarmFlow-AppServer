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
exports.userController = void 0;
const catchAsync_1 = __importDefault(require("../../../utils/catchAsync"));
const http_status_1 = __importDefault(require("http-status"));
const sendResponse_1 = __importDefault(require("../../../utils/sendResponse"));
const user_service_1 = require("./user.service");
const AppError_1 = __importDefault(require("../../../errors/AppError"));
// Create a new user
const createUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = req.body;
    const newUser = yield user_service_1.userServices.createUserIntoDB(userData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "Users fetched successfully",
        data: newUser,
    });
}));
const getAllUsers = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const Users = yield user_service_1.userServices.getAllUsersFromDB();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "All Users fetched successfully",
        data: Users,
    });
}));
const getUserById = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.userId;
    const user = yield user_service_1.userServices.getUserByIdFromDB(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "User fetched successfully",
        data: user,
    });
}));
const getMe = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const user = yield user_service_1.userServices.getMeFromDB((_a = req.user) === null || _a === void 0 ? void 0 : _a.userPhone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.CREATED,
        success: true,
        message: "User fetched successfully",
        data: user,
    });
}));
// Toggle user status between active and blocked
const toggleUserStatus = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const updatedUser = yield user_service_1.userServices.toggleUserStatus(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: `User status updated to ${updatedUser.status}`,
        data: updatedUser,
    });
}));
// Update user data
const updateUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("ctrl touch");
    const { userId } = req.params;
    const updates = req.body;
    const userPhone = req.user.userPhone; // Set by auth middleware
    const role = req.user.role; // Set by auth middleware
    const updatedUser = yield user_service_1.userServices.updateUserData(role, userId, userPhone, updates);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User data updated successfully",
        data: updatedUser,
    });
}));
// Update user password
const updatePassword = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const { oldPassword, newPassword } = req.body;
    const userPhone = req.user.userPhone; // Set by auth middleware
    const role = req.user.role; // Set by auth middleware
    if (!newPassword) {
        throw new AppError_1.default(400, "New password is required");
    }
    const updatedUser = yield user_service_1.userServices.updateUserPassword(userId, userPhone, role, oldPassword, newPassword);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Password updated successfully",
        data: updatedUser,
    });
}));
const softDeleteUser = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params;
    const deletedUser = yield user_service_1.userServices.softDeleteUserInDB(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User deleted successfully",
        data: deletedUser,
    });
}));
exports.userController = {
    createUser,
    toggleUserStatus,
    updateUser,
    updatePassword,
    softDeleteUser,
    getAllUsers,
    getUserById,
    getMe
};
