const baseUrl = (process.argv[2] || process.env.APP_URL || "").trim().replace(/\/$/, "");

if (!baseUrl) {
  console.error("Usage: node scripts/postdeploy-smoke-check.mjs <base-url>");
  console.error("Example: node scripts/postdeploy-smoke-check.mjs https://your-app.vercel.app");
  process.exit(1);
}

const checks = [
  { name: "Home page", method: "GET", path: "/", expect: [200] },
  { name: "Admin page route", method: "GET", path: "/admin", expect: [200, 307, 308] },
  { name: "Login API present", method: "GET", path: "/api/auth/login", expect: [405] },
  { name: "Upload API present", method: "GET", path: "/api/upload", expect: [405] },
  { name: "Convert API auth gate", method: "POST", path: "/api/convert/smoke-check", expect: [401] },
  { name: "Download API auth gate", method: "GET", path: "/api/download/smoke-check", expect: [401] },
  { name: "Preview API auth gate", method: "GET", path: "/api/preview/smoke-check", expect: [401] },
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method,
      redirect: "manual",
    });
    const ok = check.expect.includes(response.status);
    if (!ok) {
      failed = true;
      console.error(
        `FAIL ${check.name}: expected ${check.expect.join("/")}, got ${response.status}`
      );
    } else {
      console.log(`PASS ${check.name}: ${response.status}`);
    }
  } catch (error) {
    failed = true;
    console.error(`FAIL ${check.name}: ${String(error)}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("Smoke check passed.");
