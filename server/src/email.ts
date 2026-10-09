import { Resend } from "resend";

export class EmailServiceError extends Error {
  constructor(public readonly code: "configuration" | "provider" | "network") {
    super(code === "configuration" ? "Email service is not configured." : "Unable to send email. Please try again later.");
    this.name = "EmailServiceError";
  }
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Initialize only when sending; missing email configuration cannot break server startup.
export async function sendEmail(message: EmailMessage, idempotencyKey?: string): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new EmailServiceError("configuration");

  try {
    const { data, error } = await new Resend(apiKey).emails.send(
      { ...message, from },
      idempotencyKey ? { idempotencyKey } : undefined,
    );
    if (error || !data?.id) throw new EmailServiceError("provider");
    return { id: data.id };
  } catch (error) {
    if (error instanceof EmailServiceError) throw error;
    // Never propagate provider messages, request details, or credentials.
    throw new EmailServiceError("network");
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character]!));
}

// Rendering only: code generation, expiry, storage, and verification belong to future auth work.
export function passwordResetEmailTemplate(verificationCode: string): Omit<EmailMessage, "to"> {
  if (!verificationCode.trim()) throw new Error("A verification code is required.");
  return {
    subject: "Type Tiles password reset verification code",
    text: `Your Type Tiles password reset verification code is: ${verificationCode}\n\nDo not share this code. If you did not request a password reset, ignore this email.`,
    html: `<h1>Type Tiles password reset</h1><p>Your verification code is:</p><p style="font-size:28px;font-weight:bold">${escapeHtml(verificationCode)}</p><p>Do not share this code. If you did not request a password reset, ignore this email.</p>`,
  };
}

export function sendPasswordResetEmail(to: string, verificationCode: string): Promise<{ id: string }> {
  return sendEmail({ to, ...passwordResetEmailTemplate(verificationCode) });
}

export function emailVerificationTemplate(code: string): Omit<EmailMessage, "to"> {
  if (!/^\d{6}$/.test(code)) throw new Error("A six-digit verification code is required.");
  return {
    subject: "Verify your Type Tiles email",
    text: `Welcome to Type Tiles! Your email verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it. If you did not create an account, ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;background:#08122e;color:#ffffff;padding:32px"><h1 style="color:#8db0ff">Type Tiles</h1><h2>Verify your email</h2><p>Use this code to complete your account registration:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${escapeHtml(code)}</p><p>This code expires in 10 minutes. Do not share it.</p><p>If you did not create an account, ignore this email.</p></div>`,
  };
}

export function sendEmailVerificationCode(to: string, code: string): Promise<{ id: string }> {
  return sendEmail({ to, ...emailVerificationTemplate(code) });
}
