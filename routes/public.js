// ─────────────────────────────────────────────────────────
//  routes/public.js — Public (unauthenticated) routes
//  These endpoints are open to anyone — no token required.
// ─────────────────────────────────────────────────────────

const express = require("express");

const router = express.Router();

/**
 * @swagger
 * /public/info:
 *   get:
 *     summary: Read public, open data
 *     description: This endpoint is open to everyone — no authentication required.
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Public information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Welcome stranger! This info is public."
 */
router.get("/info", (req, res) => {
  res.status(200).json({
    message: "Welcome stranger! This info is public.",
  });
});

module.exports = router;
