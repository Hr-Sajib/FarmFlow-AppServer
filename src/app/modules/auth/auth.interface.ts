export type TLoginUser = {
  email: string;
  password: string;
};

export type TForgotPassword = { email: string };
export type TVerifyResetCode = { email: string; code: string };
export type TResetPassword = { resetToken: string; newPassword: string };
export type TChangePassword = { oldPassword: string; newPassword: string };
