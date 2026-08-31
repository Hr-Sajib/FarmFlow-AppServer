import nodemailer from "nodemailer";
import config from "../../config";

/**
 * SMTP is used rather than a provider SDK so the same code works against
 * Gmail, Mailtrap, or Amazon SES (which exposes an SMTP endpoint) by changing
 * environment variables alone.
 *
 * When SMTP is not configured the message is logged instead of sent, so local
 * development and tests never depend on a live mail server. That fallback is
 * refused outside development — silently not sending a password reset in
 * production would be worse than failing loudly.
 */
const isSmtpConfigured = (): boolean =>
  Boolean(config.smtp.host && config.smtp.user && config.smtp.password);

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> => {
  if (!isSmtpConfigured()) {
    if (config.NODE_ENV === "production") {
      throw new Error(
        "SMTP is not configured; refusing to silently drop an outgoing email"
      );
    }
    console.info(
      `[email:dev] To: ${options.to}\nSubject: ${options.subject}\n${options.text}`
    );
    return;
  }

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
};

export const buildResetCodeEmail = (code: string, ttlMinutes: number) => ({
  subject: "Your FarmFlow password reset code",
  text: `Your password reset code is ${code}. It expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.`,
  html: `
    <div style="font-family:system-ui,sans-serif;line-height:1.6;color:#161a19">
      <h2 style="margin:0 0 12px">Password reset</h2>
      <p>Use this code to continue resetting your FarmFlow password:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${code}</p>
      <p style="color:#6b7472">It expires in ${ttlMinutes} minutes. If you did not request this, you can safely ignore this email.</p>
    </div>
  `,
});
