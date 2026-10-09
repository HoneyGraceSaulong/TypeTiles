import { Router } from "express";
import { EmailVerificationService } from "../emailVerification.js";
import { normalizeRecoveryEmail } from "../passwordReset.js";

export function createEmailVerificationRouter(service: EmailVerificationService) {
  const router = Router();
  let pending = 0;
  router.post("/resend-verification-code", (req, res) => {
    const email = normalizeRecoveryEmail(req.body?.email);
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    res.set("Cache-Control", "no-store").json({ message: "If an eligible account exists, a verification code will be sent." });
    if (!email || pending >= 20) return;
    pending += 1;
    void service.resend(email, ip).catch(() => console.warn("Email verification request could not be processed."))
      .finally(() => { pending -= 1; });
  });
  router.post("/verify-email", async (req, res) => {
    res.set("Cache-Control", "no-store");
    const email = normalizeRecoveryEmail(req.body?.email);
    try {
      if (!email || !await service.verify(email, req.body?.code, req.ip || "unknown")) {
        return res.status(400).json({ error: "Invalid or expired verification code." });
      }
      return res.json({ message: "Email verified successfully. Please log in." });
    } catch {
      return res.status(503).json({ error: "Email verification is temporarily unavailable." });
    }
  });
  return router;
}
