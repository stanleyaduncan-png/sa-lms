#!/usr/bin/env node

/**
 * LMS Platform — Project Health Check
 * Run from the root of sa-lms:
 *   node check.mjs
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ROOT = process.cwd();
let passed = 0;
let failed = 0;

// ─── Helpers ────────────────────────────────────────────────────────────────

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, hint = "") {
  console.log(`  ❌  ${label}${hint ? `\n       → ${hint}` : ""}`);
  failed++;
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(50 - title.length)}`);
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), "utf8"); }
  catch { return null; }
}

function run(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString().trim();
  } catch (e) {
    return null;
  }
}

// ─── 1. Required files ───────────────────────────────────────────────────────

section("Required files");

const requiredFiles = [
  ["README.md",                                  "Add a README at the project root"],
  ["PROJECT.md",                                 "Add PROJECT.md — the living reference doc"],
  ["package.json",                               "Missing package.json — run npm init"],
  ["next.config.js",                             "Missing Next.js config"],
  ["tsconfig.json",                              "Missing TypeScript config"],
  ["eslint.config.mjs",                          "Missing ESLint flat config"],
  [".env.example",                               "Add .env.example so setup steps are documented"],
  [".gitignore",                                 "Add a .gitignore"],
  ["prisma/schema.prisma",                       "Missing Prisma schema — core data model lives here"],
  ["src/app/layout.tsx",                         "Missing root layout"],
  ["src/app/page.tsx",                           "Missing home page"],
  ["src/lib/auth.ts",                            "Missing Auth.js config"],
  ["src/lib/prisma.ts",                          "Missing Prisma client singleton"],
  ["src/middleware.ts",                          "Missing RBAC middleware"],
  ["src/types/next-auth.d.ts",                   "Missing NextAuth type augmentation"],
  ["src/app/api/auth/[...nextauth]/route.ts",    "Missing NextAuth API route handler"],
  ["src/app/(auth)/login/page.tsx",              "Missing login page"],
  ["src/app/(dashboard)/owner/page.tsx",         "Missing owner dashboard placeholder"],
  ["src/app/(dashboard)/org-admin/page.tsx",     "Missing org-admin dashboard placeholder"],
  ["src/app/(dashboard)/learner/page.tsx",       "Missing learner dashboard placeholder"],
  [".github/workflows/ci.yml",                   "Missing CI workflow"],
  [".github/ISSUE_TEMPLATE/requirement.md",      "Missing issue template"],
  ["docs/README.md",                             "Missing docs folder pointer"],
];

for (const [file, hint] of requiredFiles) {
  exists(file) ? ok(file) : fail(file, hint);
}

// ─── 2. .gitignore sanity ────────────────────────────────────────────────────

section("gitignore — secrets must not be tracked");

const gitignore = read(".gitignore") ?? "";
const mustIgnore = [".env", ".env.local", "node_modules", ".next"];
for (const entry of mustIgnore) {
  gitignore.includes(entry)
    ? ok(`.gitignore covers "${entry}"`)
    : fail(`.gitignore missing "${entry}"`, `Add "${entry}" to .gitignore to avoid leaking secrets or committing build artifacts`);
}

// Bonus: make sure .env.local isn't actually tracked
const tracked = run("git ls-files .env.local .env");
if (tracked) {
  fail(".env/.env.local is tracked by git!", "Run: git rm --cached .env.local && git commit -m 'chore: untrack env file'");
} else {
  ok(".env.local is not tracked by git");
}

// ─── 3. package.json — correct key dependencies ──────────────────────────────

section("package.json — dependencies");

const pkgRaw = read("package.json");
let pkg = null;
try { pkg = JSON.parse(pkgRaw); } catch { fail("package.json is not valid JSON"); }

if (pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const required = [
    ["next",                      "^15",  "Framework"],
    ["react",                     "^19",  "UI runtime"],
    ["next-auth",                 "^4",   "Auth (must be v4, not v5 beta)"],
    ["@next-auth/prisma-adapter", "^1",   "Prisma adapter for NextAuth v4 (NOT @auth/prisma-adapter)"],
    ["@prisma/client",            "^5",   "Prisma client (stay on v5, not v7)"],
    ["prisma",                    "^5",   "Prisma CLI (devDependency)"],
    ["bcryptjs",                  null,   "Password hashing"],
    ["zod",                       null,   "Validation"],
    ["pdf-lib",                   null,   "Certificate PDF generation (CERT-01)"],
    ["typescript",                null,   "TypeScript"],
  ];

  const banned = [
    ["@auth/prisma-adapter", "Use @next-auth/prisma-adapter instead — @auth/prisma-adapter targets NextAuth v5's interface and will cause type errors with v4"],
    ["next-auth",            null], // special check below for v5
  ];

  for (const [name, minMajor, label] of required) {
    const version = deps[name];
    if (!version) {
      fail(`${name} missing`, `Add to package.json — ${label}`);
    } else if (minMajor && !version.startsWith(minMajor) && !version.includes(minMajor.replace("^", ""))) {
      fail(`${name} version: ${version}`, `Expected ${minMajor}.x — ${label}`);
    } else {
      ok(`${name}: ${version}`);
    }
  }

  // Explicit ban: @auth/prisma-adapter
  if (deps["@auth/prisma-adapter"]) {
    fail(
      "@auth/prisma-adapter is present",
      "Remove it and use @next-auth/prisma-adapter instead — see PROJECT.md §4"
    );
  } else {
    ok("@auth/prisma-adapter correctly absent");
  }

  // Warn if next-auth is v5 beta
  const naVersion = deps["next-auth"] ?? "";
  if (naVersion.includes("beta") || naVersion.startsWith("^5") || naVersion.startsWith("5")) {
    fail(`next-auth is ${naVersion} (beta/v5)`, "Downgrade to ^4.24.7 — see PROJECT.md §4");
  }
}

// ─── 4. Prisma schema — key models present ───────────────────────────────────

section("Prisma schema — BRD entities");

const schema = read("prisma/schema.prisma") ?? "";

const models = [
  ["User",         "AUTH-01 / DB-01"],
  ["Organization", "ACC-01 / DB-01"],
  ["Invitation",   "ACC-07"],
  ["Course",       "CRS-01"],
  ["Section",      "CRS-02"],
  ["Lesson",       "CRS-03"],
  ["Enrollment",   "TRK-01 / DB-02"],
  ["Progress",     "TRK-01"],
  ["Quiz",         "REV-01"],
  ["QuizQuestion", "REV-01"],
  ["QuizAttempt",  "REV-04"],
  ["Certificate",  "CERT-01"],
  ["CourseGrant",  "ACC-02"],
];

for (const [model, reqId] of models) {
  schema.includes(`model ${model}`)
    ? ok(`model ${model} (${reqId})`)
    : fail(`model ${model} missing`, `Required by ${reqId} — check prisma/schema.prisma`);
}

// Check enums
const enums = ["Role", "CourseStatus", "LessonContentType", "ProgressStatus", "InvitationStatus"];
for (const e of enums) {
  schema.includes(`enum ${e}`)
    ? ok(`enum ${e}`)
    : fail(`enum ${e} missing`, "Check prisma/schema.prisma");
}

// ─── 5. Prisma client generated ─────────────────────────────────────────────

section("Prisma client — generated");

const prismaClientExists = exists("node_modules/.prisma/client") &&
  fs.readdirSync(path.join(ROOT, "node_modules/.prisma/client")).length > 0;

prismaClientExists
  ? ok("Prisma client generated (node_modules/.prisma/client exists)")
  : fail("Prisma client not generated", "Run: npx prisma generate");

// ─── 6. node_modules installed ───────────────────────────────────────────────

section("Dependencies installed");

const nmExists = exists("node_modules");
nmExists
  ? ok("node_modules present")
  : fail("node_modules missing", "Run: npm install");

// Key packages actually on disk (not just in package.json)
const keyPackages = ["next", "react", "next-auth", "prisma", "zod"];
for (const pkg of keyPackages) {
  exists(`node_modules/${pkg}`)
    ? ok(`node_modules/${pkg}`)
    : fail(`node_modules/${pkg} not installed`, "Run: npm install");
}

// ─── 7. Environment ──────────────────────────────────────────────────────────

section("Environment");

const hasEnvLocal = exists(".env.local");
const hasEnvDev   = exists(".env.development.local");
const hasEnvAny   = hasEnvLocal || hasEnvDev;

hasEnvAny
  ? ok(".env.local (or equivalent) present")
  : fail(".env.local missing", "Copy .env.example to .env.local and fill in DATABASE_URL and NEXTAUTH_SECRET");

if (hasEnvLocal) {
  const envContent = read(".env.local") ?? "";
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
  for (const v of requiredVars) {
    envContent.includes(v)
      ? ok(`.env.local defines ${v}`)
      : fail(`.env.local missing ${v}`, `Add ${v} to .env.local`);
  }
}

// ─── 8. Epic 2 — Access & Invitations ────────────────────────────────────────

section("Epic 2 — Access & Invitations");

const epic2Files = [
  ["src/actions/organizations.ts",                        "Missing organization server actions (ACC-01/02/03)"],
  ["src/actions/invitations.ts",                           "Missing invitation server actions (ACC-06/07/08)"],
  ["src/app/(dashboard)/owner/organizations/page.tsx",     "Missing Owner organizations UI"],
  ["src/app/(dashboard)/owner/invitations/page.tsx",       "Missing Owner invitations UI"],
  ["src/app/(dashboard)/org-admin/invitations/page.tsx",   "Missing Org Admin invitations UI"],
  ["src/app/invite/accept/page.tsx",                       "Missing invitation acceptance page"],
];

for (const [file, hint] of epic2Files) {
  exists(file) ? ok(file) : fail(file, hint);
}

const invitationModelMatch = schema.match(/model Invitation \{[^}]*\}/s);
const invitationModelBody = invitationModelMatch ? invitationModelMatch[0] : "";
const invitationFields = ["token", "expiresAt", "status"];
for (const field of invitationFields) {
  invitationModelBody.includes(field)
    ? ok(`Invitation model has "${field}" field`)
    : fail(`Invitation model missing "${field}" field`, "Check prisma/schema.prisma");
}

// ─── 9. Epic 3 — Course Authoring ────────────────────────────────────────────

section("Epic 3 — Course Authoring");

const epic3Files = [
  ["src/actions/courses.ts",                                       "Missing course server actions (CRS-01/08)"],
  ["src/actions/lessons.ts",                                       "Missing section/lesson server actions (CRS-02/03/09)"],
  ["src/actions/courseGrants.ts",                                  "Missing course-grant server actions (ACC-02)"],
  ["src/app/(dashboard)/owner/courses/page.tsx",                   "Missing Owner courses list UI"],
  ["src/app/(dashboard)/owner/courses/[courseId]/page.tsx",        "Missing Owner course detail UI"],
  ["src/app/(dashboard)/owner/courses/[courseId]/grants/page.tsx", "Missing Owner course grants UI"],
];

for (const [file, hint] of epic3Files) {
  exists(file) ? ok(file) : fail(file, hint);
}

const epic3Models = ["Course", "Section", "Lesson", "CourseGrant"];
for (const model of epic3Models) {
  schema.includes(`model ${model}`)
    ? ok(`model ${model} still present`)
    : fail(`model ${model} missing`, "Check prisma/schema.prisma");
}

// ─── 10. Epic 4 — Tracking & Progress ────────────────────────────────────────

section("Epic 4 — Tracking & Progress");

const epic4Files = [
  ["src/actions/enrollments.ts",                                                       "Missing enrollment server actions (DB-02, ACC-02 completion)"],
  ["src/actions/progress.ts",                                                          "Missing progress server actions (TRK-01/02/03/04/05/06/07/08)"],
  ["src/app/(dashboard)/learner/page.tsx",                                             "Missing learner catalog UI"],
  ["src/app/(dashboard)/learner/courses/[courseId]/page.tsx",                          "Missing learner course detail UI"],
  ["src/app/(dashboard)/learner/courses/[courseId]/lessons/[lessonId]/page.tsx",       "Missing lesson viewer UI"],
  ["src/app/(dashboard)/org-admin/progress/page.tsx",                                  "Missing Org Admin progress UI (TRK-07)"],
  ["src/app/(dashboard)/owner/progress/page.tsx",                                      "Missing Owner progress UI (TRK-08)"],
  ["public/scorm-test-package/index.html",                                             "Missing same-origin SCORM test package"],
];

for (const [file, hint] of epic4Files) {
  exists(file) ? ok(file) : fail(file, hint);
}

const epic4Models = ["Enrollment", "Progress"];
for (const model of epic4Models) {
  schema.includes(`model ${model}`)
    ? ok(`model ${model} still present`)
    : fail(`model ${model} missing`, "Check prisma/schema.prisma");
}

const progressModelMatch = schema.match(/model Progress \{[^}]*\}/s);
const progressModelBody = progressModelMatch ? progressModelMatch[0] : "";
progressModelBody.includes("scormData")
  ? ok('Progress model has "scormData" field')
  : fail('Progress model missing "scormData" field', "Check prisma/schema.prisma");

// ─── 11. Epic 5 — Reviewing (Assessment) ─────────────────────────────────────

section("Epic 5 — Reviewing (Assessment)");

const epic5Files = [
  ["src/actions/quizzes.ts",                                                                "Missing quiz authoring server actions (REV-01/02)"],
  ["src/actions/quizAttempts.ts",                                                            "Missing quiz attempt server actions (REV-03/04)"],
  ["src/app/(dashboard)/owner/courses/[courseId]/QuizManager.tsx",                           "Missing Owner quiz authoring UI"],
  ["src/app/(dashboard)/learner/courses/[courseId]/lessons/[lessonId]/QuizPlayer.tsx",       "Missing learner quiz-taking UI"],
];

for (const [file, hint] of epic5Files) {
  exists(file) ? ok(file) : fail(file, hint);
}

const epic5Models = ["Quiz", "QuizQuestion", "QuizAttempt"];
for (const model of epic5Models) {
  schema.includes(`model ${model}`)
    ? ok(`model ${model} still present`)
    : fail(`model ${model} missing`, "Check prisma/schema.prisma");
}
schema.includes("enum QuestionType")
  ? ok("enum QuestionType still present")
  : fail("enum QuestionType missing", "Check prisma/schema.prisma");

// ─── 12. Epic 6 — Certificates ───────────────────────────────────────────────

section("Epic 6 — Certificates");

const epic6Files = [
  ["src/actions/certificates.ts",                                        "Missing certificate server actions (CERT-01/02/03/04)"],
  ["src/lib/certificateTemplate.ts",                                     "Missing certificate template config + PDF generator (CERT-05)"],
  ["src/app/api/certificates/[certificateId]/pdf/route.ts",              "Missing certificate PDF download route"],
  ["src/app/(dashboard)/learner/certificates/page.tsx",                  "Missing learner certificates UI (CERT-03)"],
  ["src/app/(dashboard)/org-admin/certificates/page.tsx",                "Missing Org Admin certificates UI (CERT-04)"],
  ["src/app/(dashboard)/owner/certificates/page.tsx",                    "Missing Owner certificates UI"],
];

for (const [file, hint] of epic6Files) {
  exists(file) ? ok(file) : fail(file, hint);
}

schema.includes("model Certificate")
  ? ok("model Certificate still present")
  : fail("model Certificate missing", "Check prisma/schema.prisma");

const certificateModelMatch = schema.match(/model Certificate \{[^}]*\}/s);
const certificateModelBody = certificateModelMatch ? certificateModelMatch[0] : "";
const certificateFields = ["userId", "courseId", "pdfUrl", "issuedAt"];
for (const field of certificateFields) {
  certificateModelBody.includes(field)
    ? ok(`Certificate model has "${field}" field`)
    : fail(`Certificate model missing "${field}" field`, "Check prisma/schema.prisma");
}
certificateModelBody.includes("@@unique([userId, courseId])")
  ? ok("Certificate model has @@unique([userId, courseId])")
  : fail("Certificate model missing @@unique([userId, courseId])", "Check prisma/schema.prisma");

// ─── 13. Git sanity ──────────────────────────────────────────────────────────

section("Git");

const isGitRepo = exists(".git");
isGitRepo
  ? ok(".git directory present")
  : fail("Not a git repository", "Run: git init");

const remoteUrl = run("git remote get-url origin");
if (remoteUrl) {
  remoteUrl.includes("stanleyaduncan-png/sa-lms")
    ? ok(`Remote origin: ${remoteUrl}`)
    : fail(`Remote origin: ${remoteUrl}`, "Expected stanleyaduncan-png/sa-lms");
} else {
  fail("No git remote set", "Run: git remote add origin https://github.com/stanleyaduncan-png/sa-lms.git");
}

const branch = run("git branch --show-current");
branch
  ? ok(`Current branch: ${branch}`)
  : fail("Could not determine current branch");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(52)}`);
console.log(`  ${passed} passed · ${failed} failed`);

if (failed === 0) {
  console.log("\n  🎉 All checks passed — scaffold looks good!");
  console.log("  Next step: npm run dev → open http://localhost:3000\n");
} else {
  console.log("\n  Fix the ❌ items above, then re-run: node check.mjs\n");
  process.exit(1);
}
