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
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { admin as adminPlugin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc, userAc } from "better-auth/plugins/admin/access";
import { getMigrations } from "better-auth/db/migration";
import { toNodeHandler } from "better-auth/node";

const ROLES = ["admin", "presenter"];
const dbPath = process.env.AUTH_DB_PATH || "./data/auth.db";
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
    minPasswordLength: 10,
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  advanced: { useSecureCookies: baseURL.startsWith("https://") },
  plugins: [adminPlugin({ ac, roles, defaultRole: "presenter", adminRoles: ["admin"] })],
});

const { runMigrations } = await getMigrations(auth.options);
await runMigrations();

const tempPassword = () => randomBytes(12).toString("base64url");

async function findUser(email) {
  const { users } = await auth.api.listUsers({
    query: { searchField: "email", searchValue: email, searchOperator: "contains", limit: 50 },
  });
  const u = users.find((x) => x.email.toLowerCase() === email.toLowerCase());
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
    const password = tempPassword();
    await auth.api.setUserPassword({ body: { userId: u.id, newPassword: password } });
    await auth.api.revokeUserSessions({ body: { userId: u.id } });
    console.log(`reset ${email}; temporary password: ${password} (other sessions signed out)`);
  } else if (cmd === "role") {
    if (!ROLES.includes(a)) throw new Error(`role must be one of ${ROLES.join(", ")}`);
    const u = await findUser(email);
    await auth.api.setRole({ body: { userId: u.id, role: a } });
    console.log(`${email} is now ${a}`);
  } else {
    throw new Error("usage: user create <email> <name> <role> | user reset <email> | user role <email> <role>");
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
