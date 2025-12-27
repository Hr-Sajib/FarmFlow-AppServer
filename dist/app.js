"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const globalErrorhandler_1 = __importDefault(require("./app/middlewares/globalErrorhandler"));
const user_route_1 = require("./app/modules/appData/user/user.route");
const auth_route_1 = require("./app/modules/appData/auth/auth.route");
const sensorData_routes_1 = __importDefault(require("./app/modules/sensorData/sensorData.routes"));
const post_route_1 = require("./app/modules/appData/posts/post.route");
const fields_route_1 = require("./app/modules/appData/fields/fields.route");
const chat_route_1 = require("./app/modules/chat/chat.route");
const app = (0, express_1.default)();
/**
 * =========================
 * 🌍 OPEN CORS (NO CRASH)
 * =========================
 */
app.use((0, cors_1.default)({
    origin: true, // ✅ allow ANY origin dynamically
    credentials: true, // keep working auth
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
/**
 * =========================
 * Routes
 * =========================
 */
app.use("/user", user_route_1.UserRoutes);
app.use("/auth", auth_route_1.AuthRoutes);
app.use("/sensorData", sensorData_routes_1.default);
app.use("/post", post_route_1.PostRoutes);
app.use("/field", fields_route_1.FieldRoutes);
app.use("/chat", chat_route_1.ChatRoutes);
/**
 * =========================
 * Health Check
 * =========================
 */
app.get("/", (req, res) => {
    res.json({
        message: "FarmFlow API is running and accessible 🌍",
    });
});
/**
 * =========================
 * Global Error Handler (LAST)
 * =========================
 */
app.use(globalErrorhandler_1.default);
exports.default = app;
