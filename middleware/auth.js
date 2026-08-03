// ─────────────────────────────────────────────────────────
//  middleware/auth.js — Reusable authentication guard
//  Verifies the JWT from the Authorization header via
//  Supabase, then attaches the user to req.user.
// ─────────────────────────────────────────────────────────

const supabase = require("../supabaseClient");

/**
 * Express middleware that verifies a Bearer token.
 *
 * - Checks the Authorization header exists and starts with "Bearer "
 * - Calls supabase.auth.getUser(token) to verify with Supabase
 * - Attaches the verified user to req.user
 * - Returns 401 on any failure
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check header exists and has correct format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify the token with Supabase — this makes a real network call
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Attach the verified user to the request for downstream handlers
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = requireAuth;
