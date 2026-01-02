// Test script to verify path matching logic
const publicPaths = [
  "/login",
  "/auth/callback",
  "/auth/verify-email",
  "/auth/reset-password",
  "/auth/pending",
  "/auth/denied",
  "/terms",
  "/privacy",
  "/join-",
  "/join/",
  "/register/",
];

const testPaths = [
  "/register/abc123-token",
  "/register/",
  "/login",
  "/dashboard",
  "/join-the-standard",
  "/join/recruiter123",
];

console.log("Testing path matching logic:\n");

testPaths.forEach(testPath => {
  const isPublic = publicPaths.some(path => testPath.startsWith(path));
  console.log(`Path: ${testPath.padEnd(30)} → ${isPublic ? "✅ PUBLIC" : "❌ PROTECTED (will redirect to login)"}`);
});

console.log("\n\nDetailed check for /register/abc123:");
publicPaths.forEach(path => {
  const matches = "/register/abc123".startsWith(path);
  console.log(`  "/register/abc123".startsWith("${path}") → ${matches}`);
});
