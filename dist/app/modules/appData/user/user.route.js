"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const auth_1 = __importDefault(require("../../../middlewares/auth"));
const user_controller_1 = require("./user.controller");
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.post("/register", user_controller_1.userController.createUser);
router.get("/", (0, auth_1.default)("admin"), user_controller_1.userController.getAllUsers);
router.get("/:userId", (0, auth_1.default)("admin"), user_controller_1.userController.getUserById);
router.post("/getMe", (0, auth_1.default)("admin", "farmer"), user_controller_1.userController.getMe);
router.patch("/toggle-status/:userId", (0, auth_1.default)("admin"), user_controller_1.userController.toggleUserStatus);
router.patch("/update-password/:userId", (0, auth_1.default)("admin", "farmer"), user_controller_1.userController.updatePassword);
router.patch("/:userId", (0, auth_1.default)("admin", "farmer"), user_controller_1.userController.updateUser);
router.delete("/:userId", (0, auth_1.default)("admin"), user_controller_1.userController.softDeleteUser);
exports.UserRoutes = router;
