import { Router } from "express";
import { normalizeRecoveryEmail, PasswordResetService, validResetPassword } from "../passwordReset.js";

const GENERIC = { message: "If an eligible account exists, a password reset code will be sent." };
const INVALID = { error: "Invalid or expired reset code." };

export function createPasswordResetRouter(service = new PasswordResetService()) {
  const router = Router();
  // Bounded work queue. Respond before delivery/database work, equally for every email.
  let pending = 0;
  router.post("/forgot-password", (req, res) => {
    const email = normalizeRecoveryEmail(req.body?.email);
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    res.set("Cache-Control", "no-store").status(200).json(GENERIC);
    if (!email || pending >= 20) return;
    pending += 1;
    void service.forgot(email, ip).catch(() => {
      console.warn("Password recovery request could not be processed.");
    }).finally(() => { pending -= 1; });
  });

  router.post("/verify-reset-code", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const email = normalizeRecoveryEmail(req.body?.email);
    try {
      if (!email || !await service.verify(email, req.body?.code, req.ip || "unknown")) return res.status(400).json(INVALID);
      return res.json({ valid: true });
    } catch {
      return res.status(503).json({ error: "Password recovery is temporarily unavailable." });
    }
  });

  router.post("/reset-password", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const email = normalizeRecoveryEmail(req.body?.email);
    const password = req.body?.newPassword;
    // Preserve the six-character minimum; prevent silent bcrypt truncation beyond 72 bytes.
    if (!validResetPassword(password)) {
      return res.status(400).json({ error: "Password must be at least 6 characters and at most 72 UTF-8 bytes." });
    }
    try {
      if (!email || !await service.reset(email, req.body?.code, password, req.ip || "unknown")) return res.status(400).json(INVALID);
      return res.json({ message: "Password reset successfully. Please log in again." });
    } catch {
      return res.status(503).json({ error: "Password recovery is temporarily unavailable." });
    }
  });
  return router;
}
