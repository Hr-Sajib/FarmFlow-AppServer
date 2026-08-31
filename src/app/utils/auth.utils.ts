import jwt, { JwtPayload } from "jsonwebtoken";

export type TTokenPayload = {
  /** Stable internal id. Contact details can change; this cannot. */
  userId: string;
  email: string;
  role: string;
};

export const createToken = (
  payload: TTokenPayload,
  secret: string,
  expiresIn: string
): string => jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);

export const verifyToken = (token: string, secret: string): JwtPayload =>
  jwt.verify(token, secret) as JwtPayload;

/**
 * Short-lived token proving the reset code was verified, so stage three does
 * not have to accept the code again (which would let it be replayed).
 * `purpose` prevents it being presented as an access token.
 */
export const createResetToken = (
  userId: string,
  secret: string,
  expiresIn: string
): string =>
  jwt.sign({ userId, purpose: "password_reset" }, secret, {
    expiresIn,
  } as jwt.SignOptions);
