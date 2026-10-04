import { Router, Request, Response } from "express";
import { getDatabase } from "../db.js";
import { hashPassword, verifyPassword, generateToken, normalizeRole } from "../auth.js";
import { authMiddleware } from "../middleware.js";

const router = Router();

interface RegisterBody {
  username: string;
  email: string;
  password: string;
  displayName: string;
}

interface LoginBody {
  username: string;
  password: string;
}

interface ProfileUpdateBody {
  displayName?: string;
  avatar?: string;
  background?: string;
}

const AVATAR_IDS = new Set(["hani", "helen", "jacq", "kyla", "liscano"]);
const BACKGROUND_IDS = new Set(["blues", "volts"]);

// Register
router.post("/register", async (req: Request<{}, {}, RegisterBody>, res: Response) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const db = getDatabase();

    // Check if user exists
    const existing = await db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email]);
    if (existing) {
      return res.status(409).json({ error: "Username or email already taken" });
    }

    const passwordHash = await hashPassword(password);

    const result = await db.run(
      `INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, displayName]
    );

    const userId = result.lastID;
    if (typeof userId !== "number") {
      throw new Error("User registration did not return an ID");
    }

    // Create user stats entry
    await db.run(`INSERT INTO user_stats (user_id) VALUES (?)`, [userId]);

    // Generate token
    const token = generateToken({
      userId,
      username,
      role: "student",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: userId,
        username,
        email,
        displayName,
        tier: "Volt",
        role: "student",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Login
router.post("/login", async (req: Request<{}, {}, LoginBody>, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const db = getDatabase();

    const user = await db.get(
      `SELECT id, username, email, password_hash, display_name, avatar, background, tier, role, is_banned FROM users WHERE username = ?`,
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: "This account has been banned" });
    }

    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: normalizeRole(user.role),
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        background: user.background,
        tier: user.tier,
        role: normalizeRole(user.role),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const user = await db.get(
      `SELECT id, username, email, display_name, avatar, tier, role FROM users WHERE id = ?`,
      [req.user!.userId]
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const stats = await db.get(`SELECT * FROM user_stats WHERE user_id = ?`, [user.id]);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        tier: user.tier,
        role: normalizeRole(user.role),
      },
      stats,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/me/profile", authMiddleware, async (req: Request<{}, {}, ProfileUpdateBody>, res: Response) => {
  try {
    const displayName = req.body.displayName?.trim();
    const avatar = req.body.avatar;
    const background = req.body.background;
    if (displayName !== undefined && !displayName) {
      return res.status(400).json({ error: "Display name is required" });
    }

    if (avatar !== undefined && !AVATAR_IDS.has(avatar)) {
      return res.status(400).json({ error: "Invalid avatar" });
    }

    if (background !== undefined && !BACKGROUND_IDS.has(background)) {
      return res.status(400).json({ error: "Invalid background" });
    }

    if (displayName === undefined && avatar === undefined && background === undefined) {
      return res.status(400).json({ error: "No profile changes supplied" });
    }

    const db = getDatabase();
    const updates: string[] = [];
    const values: (string | number)[] = [];
    if (displayName !== undefined) {
      updates.push("display_name = ?");
      values.push(displayName);
    }
    if (avatar !== undefined) {
      updates.push("avatar = ?");
      values.push(avatar);
    }
    if (background !== undefined) {
      updates.push("background = ?");
      values.push(background);
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(req.user!.userId);
    await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    const user = await db.get(
      "SELECT id, username, email, display_name, avatar, background, tier, role FROM users WHERE id = ?",
      [req.user!.userId],
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        background: user.background,
        tier: user.tier,
        role: normalizeRole(user.role),
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
