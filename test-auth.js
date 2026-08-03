// Quick test script for all auth endpoints
const http = require("http");

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (data) options.headers["Content-Length"] = Buffer.byteLength(data);

    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log(`\n${method} ${path} → ${res.statusCode}`);
        try { console.log(JSON.stringify(JSON.parse(body), null, 2)); }
        catch { console.log(body || "(no body)"); }
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function addAuthHeader(method, path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        console.log(`\n${method} ${path} (with token) → ${res.statusCode}`);
        try { console.log(JSON.stringify(JSON.parse(body), null, 2)); }
        catch { console.log(body || "(no body)"); }
        resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null });
      });
    });
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  // Use a unique email each run to avoid "user already exists"
  const testEmail = `flyrank_test_${Date.now()}@gmail.com`;
  console.log(`Using test email: ${testEmail}`);

  console.log("\n=== STAGE 1: Signup ===");
  const signup = await request("POST", "/auth/signup", {
    email: testEmail,
    password: "password123",
  });

  console.log("\n=== STAGE 1: Signup with missing password (expect 400) ===");
  await request("POST", "/auth/signup", { email: "test@gmail.com" });

  console.log("\n=== STAGE 1: Login ===");
  const login = await request("POST", "/auth/login", {
    email: testEmail,
    password: "password123",
  });

  console.log("\n=== STAGE 1: Login with wrong password (expect 401) ===");
  await request("POST", "/auth/login", {
    email: testEmail,
    password: "wrongpassword",
  });

  console.log("\n=== STAGE 2: Public route (expect 200) ===");
  await request("GET", "/public/info");

  console.log("\n=== STAGE 2: Protected route without token (expect 401) ===");
  await request("GET", "/protected/profile");

  if (login.body?.access_token) {
    const token = login.body.access_token;

    console.log("\n=== STAGE 3: Protected route with valid token (expect 200) ===");
    await addAuthHeader("GET", "/protected/profile", token);

    console.log("\n=== STAGE 3: Protected route with tampered token (expect 401) ===");
    await addAuthHeader("GET", "/protected/profile", token + "TAMPERED");

    console.log("\n=== STAGE 4: Dashboard with valid token (expect 200, proves middleware reuse) ===");
    await addAuthHeader("GET", "/protected/dashboard", token);

    console.log("\n=== STAGE 4: Admin route (expect 403 — authenticated but not admin) ===");
    await addAuthHeader("GET", "/admin/users", token);

    console.log("\n=== STAGE 4: Logout (expect 204) ===");
    await addAuthHeader("POST", "/auth/logout", token);
  } else {
    console.log("\n⚠️  Login failed — skipping authenticated tests.");
    console.log("Make sure email confirmation is disabled in Supabase Dashboard:");
    console.log("Authentication → Sign In / Providers → Email → turn off 'Confirm email'");
  }

  console.log("\n=== ALL TESTS COMPLETE ===");
})();
