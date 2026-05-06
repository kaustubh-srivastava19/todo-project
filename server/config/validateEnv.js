const required = ['MONGO_URI', 'JWT_SECRET'];

const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(` Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

console.log("✅ Environment variables validated");