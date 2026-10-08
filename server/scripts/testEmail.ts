import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { EmailServiceError, passwordResetEmailTemplate, sendEmail } from "../src/email.js";

// Always load the backend .env, regardless of the caller's working directory.
config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Email testing requires NODE_ENV=development.");
  }
  const to = process.env.RESEND_TEST_TO_EMAIL?.trim();
  if (!to || !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(to)) {
    throw new Error("Configure RESEND_TEST_TO_EMAIL with one fixed email address in server/.env.");
  }
  if (process.argv.length > 2) throw new Error("This script accepts no arguments; the recipient must be configured in server/.env.");

  const template = passwordResetEmailTemplate("123456");
  const result = await sendEmail({
    to,
    ...template,
    subject: "[Development test] Type Tiles password reset email",
    text: `Development test only. The sample code is not valid for authentication.\n\n${template.text}`,
    html: `<p><strong>Development test only. The sample code is not valid for authentication.</strong></p>${template.html}`,
  }, "type-tiles-phase-1a-development-test-v1");
  console.log(`Resend accepted the test email. Email ID: ${result.id}`);
  console.log("Inbox delivery has not been verified. The fixed idempotency key prevents duplicate sends on retries within Resend's deduplication window.");
}

main().catch((error: unknown) => {
  console.error(error instanceof EmailServiceError
    ? `Email test failed (${error.code}): ${error.message}`
    : error instanceof Error ? error.message : "Email test failed.");
  process.exitCode = 1;
});
