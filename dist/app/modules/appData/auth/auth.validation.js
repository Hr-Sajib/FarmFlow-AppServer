"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthValidation = exports.loginValidationSchema = void 0;
const zod_1 = require("zod");
exports.loginValidationSchema = zod_1.z.object({
    body: zod_1.z.object({
        phone: zod_1.z
            .string({
            invalid_type_error: 'Phone must be a string',
            required_error: 'Phone number is required',
        })
            .length(11, { message: 'Phone number must be exactly 11 digits long' })
            .regex(/^01\d{9}$/, { message: 'Phone number must start with "01" and be 11 digits long' })
            .trim(),
        password: zod_1.z
            .string({
            invalid_type_error: 'Password must be a string',
            required_error: 'Password is required',
        })
            .min(6, { message: 'Password must be at least 6 characters long' }),
    }),
});
const changePasswordValidationSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        phone: zod_1.z
            .string({
            invalid_type_error: 'Phone must be a string',
        })
            .length(11, { message: 'Phone number must be exactly 11 digits long' })
            .regex(/^01\d{9}$/, { message: 'Phone number must start with "01" and be 11 digits long' })
            .trim()
            .optional(),
        oldPassword: zod_1.z
            .string({
            invalid_type_error: 'Old password must be a string',
            required_error: 'Old password is required',
        })
            .min(6, { message: 'Old password must be at least 6 characters long' }),
        newPassword: zod_1.z
            .string({
            invalid_type_error: 'New password must be a string',
            required_error: 'New password is required',
        })
            .min(6, { message: 'New password must be at least 6 characters long' })
            .max(20, { message: 'New password cannot be more than 20 characters' }),
    })
});
const refreshTokenValidationSchema = zod_1.z.object({
    cookies: zod_1.z.object({
        refreshToken: zod_1.z.string({
            required_error: 'Refresh token is required!',
        }),
    }),
});
exports.AuthValidation = {
    loginValidationSchema: exports.loginValidationSchema,
    changePasswordValidationSchema,
    refreshTokenValidationSchema,
};
