// ─────────────────────────────────────────────────────────
//  routes/protected.js — Protected (authenticated) routes
//  Every route here uses the requireAuth middleware.
//  The guard verifies the JWT; the route body only runs
//  after the user is confirmed.
// ─────────────────────────────────────────────────────────

const express = require("express");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// ─────────── GET /protected/profile ───────────

/**
 * @swagger
 * /protected/profile:
 *   get:
 *     summary: Read private profile data
 *     description: Returns the authenticated user's profile. Requires a valid Bearer token.
 *     tags: [Protected]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 created_at:
 *                   type: string
 *       401:
 *         description: Missing, malformed, or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile", requireAuth, (req, res) => {
  // req.user was attached by the requireAuth middleware
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at,
  });
});

// ─────────── GET /protected/dashboard ───────────

/**
 * @swagger
 * /protected/dashboard:
 *   get:
 *     summary: Read dashboard data (proves middleware reuse)
 *     description: >
 *       A second protected endpoint using the same requireAuth middleware —
 *       zero new auth code required. This proves the guard is reusable.
 *     tags: [Protected]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data for the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       401:
 *         description: Missing, malformed, or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/dashboard", requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome to your dashboard, ${req.user.email}!`,
    user: {
      id: req.user.id,
      email: req.user.email,
    },
  });
});

module.exports = router;
