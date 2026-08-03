// ─────────────────────────────────────────────────────────
//  routes/auth.js — Authentication routes
//  Sign up, log in, log out, and refresh token endpoints.
//  All credential handling is delegated to Supabase Auth.
// ─────────────────────────────────────────────────────────

const express = require("express");
const rateLimit = require("express-rate-limit");
const supabase = require("../supabaseClient");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// ─────────── Rate limiter for login (stretch goal) ───────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later" },
});

// ─────────── POST /auth/signup ───────────

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, username]
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       400:
 *         description: Missing or invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;

  // Validate required fields
  if (!email || !password || !username) {
    return res
      .status(400)
      .json({ error: "Username, email, and password are required" });
  }

  // Validate username
  if (typeof username !== "string" || username.trim().length < 2) {
    return res
      .status(400)
      .json({ error: "Username must be at least 2 characters" });
  }

  // Validate email format (basic check)
  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate password length
  if (typeof password !== "string" || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  const adminSupabase = require("../adminSupabase");
  
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: username.trim() },
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});

// ─────────── POST /auth/login ───────────

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate and return a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful — returns access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Missing input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Validate required fields
  if (!email || !password) {
    return res
      .status(400)
      .json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    user: data.user,
  });
});

// ─────────── POST /auth/logout ───────────

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: End the user's session
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       204:
 *         description: Logged out successfully (no content)
 *       401:
 *         description: Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/logout", requireAuth, async (req, res) => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return res.status(500).json({ error: "Logout failed" });
  }

  res.status(204).send();
});

// ─────────── POST /auth/refresh (stretch goal) ───────────

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Exchange a refresh token for a new access token
 *     description: >
 *       Access tokens are short-lived (Supabase default: 1 hour) to limit damage
 *       if one is stolen. Refresh tokens let users get a new access token without
 *       re-entering their password.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 example: your-refresh-token-here
 *     responses:
 *       200:
 *         description: New tokens issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                 refresh_token:
 *                   type: string
 *       400:
 *         description: Missing refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/refresh", async (req, res) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const { data, error } = await supabase.auth.refreshSession({
    refresh_token,
  });

  if (error || !data?.session) {
    return res
      .status(401)
      .json({ error: "Invalid or expired refresh token" });
  }

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
});

module.exports = router;
