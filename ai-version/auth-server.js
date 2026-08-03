// AI Generated Auth Server
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// Flaw: Relies on undefined environment variables and doesn't handle failures if missing
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401);

  const { data, error } = await supabase.auth.getUser(token);
  
  // Flaw: If error occurs, it just crashes if we don't catch it properly, or it just sends 403.
  if (error || !data.user) return res.sendStatus(403);
  
  req.user = data.user;
  next();
};

app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signUp({ email, password });
  
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(data);
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) return res.status(401).json({ error: error.message });
  res.json(data.session);
});

app.post('/auth/logout', authenticateToken, async (req, res) => {
  await supabase.auth.signOut();
  res.sendStatus(204);
});

app.get('/public/info', (req, res) => {
  res.json({ message: "This is public info" });
});

app.get('/protected/profile', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
