import crypto from "crypto";

export const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 5);
export const EMAIL_EXPIRY_HOURS = Number(process.env.EMAIL_VERIFICATION_EXPIRY_HOURS || 24);

export const generateOtpCode = () => {
  // Use crypto.randomBytes for better compatibility across Node.js versions
  const bytes = crypto.randomBytes(2);
  const num = bytes.readUInt16BE(0);
  // Generate a 4-digit number between 1000 and 9999
  return ((num % 9000) + 1000).toString();
};
export const generateVerificationToken = () => crypto.randomBytes(24).toString("hex");

export const getOtpExpiryDate = () =>
  new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

export const getVerificationExpiryDate = () =>
  new Date(Date.now() + EMAIL_EXPIRY_HOURS * 60 * 60 * 1000);

export const buildOtpEmail = (name, otp) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color:#2F3645;">Hi ${name || "there"},</h2>
    <p>Use the One-Time Password (OTP) below to verify your phone number:</p>
    <div style="font-size:32px; letter-spacing:12px; font-weight:700; margin:24px 0; color:#2F3645;">
      ${otp.split("").join(" ")}
    </div>
    <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
    <p>If you didn’t request this, you can safely ignore this email.</p>
    <p style="margin-top:32px;">– SafarX Team</p>
  </div>
`;

export const buildVerificationEmail = (name, link) => `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color:#2F3645;">Welcome ${name || "traveler"}!</h2>
    <p>Your SafarX account is almost ready. Click the button below to confirm your email and finish setting things up.</p>
    <a href="${link}" style="display:inline-block; margin:24px 0; padding:12px 24px; background:#2F3645; color:#fff; border-radius:8px; text-decoration:none;">Verify Email</a>
    <p>Or copy & paste this link into your browser:</p>
    <p style="word-break:break-all;">${link}</p>
    <p>This link will expire in ${EMAIL_EXPIRY_HOURS} hours.</p>
    <p style="margin-top:32px;">Happy travels,<br/>SafarX Team</p>
  </div>
`;

