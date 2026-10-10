// BBB login service (decision D5). Better Auth on Node's built-in SQLite, its own auth.db,
// separate from the public archive database (D8). Sign-up is off: admins create accounts.
//
//   node server.mjs                                   start the service (PORT, default 3001)
//   node server.mjs user create <email> <name> <role> create a user; prints a temporary password
//   node server.mjs user reset <email>                set a new temporary password
//   node server.mjs user role <email> <role>          change role (admin | presenter)
//
// Env: BETTER_AUTH_SECRET (required, 32+ chars), BETTER_AUTH_URL (public site URL),
//      AUTH_DB_PATH (default ./data/auth.db), TRUSTED_ORIGINS (comma-separated, optional).
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { getMigrations } from "better-auth/db/migration";
import { toNodeHandler } from "better-auth/node";
import { hashPassword } from "better-auth/crypto";

const ROLES = ["admin", "presenter"];

const __dirname = dirname(fileURLToPath(import.meta.url));
function resolveDbPath() {
  if (process.env.AUTH_DB_PATH) {
    return resolve(process.cwd(), process.env.AUTH_DB_PATH);
  }
  const rootDataDb = resolve(__dirname, "../data/auth.db");
  const localDataDb = resolve(__dirname, "./data/auth.db");
  if (existsSync(rootDataDb)) return rootDataDb;
  if (existsSync(localDataDb)) return localDataDb;
  return rootDataDb;
}
const dbPath = resolveDbPath();
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  console.error("BETTER_AUTH_SECRET must be set (32+ characters).");
  process.exit(1);
}
mkdirSync(dirname(dbPath), { recursive: true });

const ac = createAccessControl(defaultStatements);
const roles = {
  admin: ac.newRole({ ...adminAc.statements }),
  presenter: ac.newRole({ ...(userAc?.statements ?? {}) }),
};

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
export const auth = betterAuth({
  database: new DatabaseSync(dbPath),
  baseURL,
  trustedOrigins: [baseURL, ...(process.env.TRUSTED_ORIGINS || "").split(",").filter(Boolean)],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true, // admin-managed accounts until email works (founders, 2026-10-09)
    minPasswordLength: 8,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { useSecureCookies: baseURL.startsWith("https://") },
  plugins: [adminPlugin({ ac, roles, defaultRole: "presenter", adminRoles: ["admin"] })],
});

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

// Auto-seed initial admin on fresh cloud deployments if 0 users exist
try {
  const seedDb = new DatabaseSync(dbPath);
  const userRow = seedDb.prepare("SELECT COUNT(*) AS count FROM user").get();
  seedDb.close();
  if (!userRow || userRow.count === 0) {
    const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@bbb.org";
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "bookworm";
    await auth.api.createUser({
      body: {
        email: adminEmail,
        name: "Admin",
        role: "admin",
        password: adminPassword,
      },
    });
    console.log(`Initial admin account created: ${adminEmail}`);
  }
} catch (seedErr) {
  console.warn("Notice during admin check/seed:", seedErr?.message || seedErr);
}

const tempPassword = () => randomBytes(12).toString("base64url");

function findUser(email) {
  const db = new DatabaseSync(dbPath);
  const u = db.prepare("SELECT * FROM user WHERE lower(email) = lower(?)").get(email);
  db.close();
  if (!u) throw new Error(`no user with email ${email}`);
  return u;
}

async function cli([cmd, email, a, b]) {
  if (cmd === "create") {
    if (!ROLES.includes(b)) throw new Error(`role must be one of ${ROLES.join(", ")}`);
    const password = tempPassword();
    await auth.api.createUser({ body: { email, name: a, role: b, password } });
    console.log(`created ${email} (${b}); temporary password: ${password}`);
  } else if (cmd === "reset") {
    const u = await findUser(email);
    const password = a || tempPassword();
    const hash = await hashPassword(password);
    const now = new Date().toISOString();
    const db = new DatabaseSync(dbPath);
    db.prepare("UPDATE account SET password = ?, updatedAt = ? WHERE userId = ? AND providerId = 'credential'").run(hash, now, u.id);
    db.prepare("DELETE FROM session WHERE userId = ?").run(u.id);
    db.close();
    console.log(`reset ${email}; password: ${password} (other sessions signed out)`);
  } else if (cmd === "role") {
    if (!ROLES.includes(a)) throw new Error(`role must be one of ${ROLES.join(", ")}`);
    const u = await findUser(email);
    await auth.api.setRole({ body: { userId: u.id, role: a } });
    console.log(`${email} is now ${a}`);
  } else {
    throw new Error("usage: user create <email> <name> <role> | user reset <email> [password] | user role <email> <role>");
  }
}

if (process.argv[2] === "user") {
  try {
    await cli(process.argv.slice(3));
    process.exit(0);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
} else {
  const handler = toNodeHandler(auth);
  const port = Number(process.env.PORT || 3001);
  createServer((req, res) => {
    if (req.url === "/healthz") return res.end("ok");
    if (req.url?.startsWith("/api/auth")) return handler(req, res);
    res.statusCode = 404;
    res.end();
  }).listen(port, () => console.log(`auth listening on :${port} (db ${dbPath})`));
}
