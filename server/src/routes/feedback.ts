import { Router, Request, Response } from "express";
import { getDatabase } from "../db.js";
import { authMiddleware } from "../middleware.js";

const router = Router();
const MAX_FEEDBACK_LENGTH = 2000;

router.post("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (typeof req.body?.message !== "string") {
      return res.status(400).json({ error: "Feedback message is required" });
    }

    const message = req.body.message.trim();
    if (!message) {
      return res.status(400).json({ error: "Feedback message is required" });
    }
    if (message.length > MAX_FEEDBACK_LENGTH) {
      return res.status(400).json({ error: `Feedback must be ${MAX_FEEDBACK_LENGTH} characters or fewer` });
    }

    await getDatabase().run(
      "INSERT INTO feedback (user_id, message) VALUES (?, ?)",
      [req.user!.userId, message],
    );

    return res.status(201).json({ message: "Feedback submitted successfully" });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;