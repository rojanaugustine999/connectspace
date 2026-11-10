// Check the environment variables BEFORE starting. A missing setting should stop the server
// with a clear message at deploy time, not cause a confusing error on the first user request.
export const isProduction = process.env.NODE_ENV === "production";

export function checkEnv() {
  const problems = [];

  for (const key of ["DATABASE_URL", "MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[key]) problems.push(`${key} is missing`);
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    problems.push("JWT_SECRET must be at least 32 characters (use a long random string)");
  }
  if (isProduction) {
    if (process.env.JWT_SECRET?.startsWith("change-me")) problems.push("JWT_SECRET is still the example value");
    if (!process.env.CLIENT_URL) problems.push("CLIENT_URL is missing (your Vercel URL, needed for Socket.io CORS)");
    if (!process.env.CLOUDINARY_URL) {
      problems.push("CLOUDINARY_URL is missing (Render's disk is wiped on every deploy, so uploads must go to Cloudinary)");
    }
  }

  if (problems.length) {
    console.error("❌ Can't start, please fix these environment variables:");
    for (const p of problems) console.error(`   - ${p}`);
    process.exit(1);
  }
}
