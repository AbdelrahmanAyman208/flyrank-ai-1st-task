// ─────────────────────────────────────────────────────────
//  supabaseClient.js — Supabase client singleton
//  Reads credentials from .env and exports a ready-to-use
//  Supabase client for auth operations.
// ─────────────────────────────────────────────────────────

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_KEY in .env — copy .env.example to .env and fill in your values."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
