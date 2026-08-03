// ─────────────────────────────────────────────────────────
//  routes/admin.js — Admin-only routes (stretch goal: 403)
//  Demonstrates the difference between 401 and 403:
//    401 = "I don't know who you are" (missing/bad token)
//    403 = "I know exactly who you are, and you still may not"
// ─────────────────────────────────────────────────────────

const express = require("express");
const requireAuth = require("../middleware/auth");

const router = express.Router();

// Hardcoded admin email for demonstration purposes.
// In production, this would be a role in the database.
const ADMIN_EMAIL = "admin@flyrank.com";

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Admin-only endpoint (demonstrates 403 Forbidden)
 *     description: >
 *       Only an admin user can access this route. A logged-in non-admin user
 *       receives 403 Forbidden — they are authenticated but not authorized.
 *       This demonstrates the critical difference: 401 means "who are you?"
 *       while 403 means "I know you, and no."
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin access granted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 admin_email:
 *                   type: string
 *       401:
 *         description: Missing or invalid token (authentication failed)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Authenticated but not authorized (not an admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Forbidden: admin access required"
 */
router.get("/users", requireAuth, (req, res) => {
  // The user is authenticated (requireAuth passed), but are they authorized?
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({
      error: "Forbidden: admin access required",
    });
  }

  // Admin access granted
  res.status(200).json({
    message: "Admin access granted. Here is the admin panel.",
    admin_email: req.user.email,
  });
});

module.exports = router;
