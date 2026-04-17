import { Resend } from "resend";

const resend = new Resend("re_your_resend_key");
const FROM = "noreply@construction-pm.com";
const APP_URL = "http://localhost:3000";

export async function sendInviteEmail(
  toEmail: string,
  fullName: string,
  inviteToken: string,
  role: string
) {
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [toEmail],
      subject: "You have been invited to Construction PM System",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e40af;">Welcome to Construction PM System</h2>
        <p>Hi ${fullName},</p>
        <p>You have been invited to join as <strong>${role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</strong>.</p>
        <p>Click the button below to set your password and get started:</p>
        <a href="${inviteUrl}" style="display:inline-block;background-color:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Set My Password</a>
        <p style="color:#6b7280;font-size:14px;">This link expires in 24 hours. If you did not expect this invitation, please ignore this email.</p>
        <p style="color:#6b7280;font-size:12px;">If the button doesn't work, copy this link: ${inviteUrl}</p>
      </div>`,
    });
  } catch (e) {
    console.error("[Email] Failed to send invite to", toEmail, e);
  }
}

export async function sendPasswordResetEmail(
  toEmail: string,
  fullName: string,
  resetToken: string
) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  try {
    await resend.emails.send({
      from: FROM,
      to: [toEmail],
      subject: "Reset Your Password — Construction PM System",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1e40af;">Password Reset Request</h2>
        <p>Hi ${fullName},</p>
        <p>We received a request to reset your password. Click the button below:</p>
        <a href="${resetUrl}" style="display:inline-block;background-color:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;margin:16px 0;">Reset Password</a>
        <p style="color:#6b7280;font-size:14px;">This link expires in 1 hour. If you did not request a password reset, please ignore this email.</p>
      </div>`,
    });
  } catch (e) {
    console.error("[Email] Failed to send reset email to", toEmail, e);
  }
}
