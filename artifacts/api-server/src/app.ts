import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// Student sync handler — shared logic for ALL sync paths
// ─────────────────────────────────────────────────────────────────────────────
async function handleSyncStudent(req: Request, res: Response): Promise<void> {
  console.log("🚨 SYNC WEBHOOK HIT — path:", req.path, "body:", req.body);

  const secret = (req.headers["x-webhook-secret"] as string) || (req.query.secret as string);
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ error: "unauthorized", message: "Invalid webhook secret" });
    return;
  }

  const { studentId, fullName, phone, gradeLevel } = req.body ?? {};
  if (!studentId || !fullName || !phone || !gradeLevel) {
    res.status(400).json({ error: "validation_error", message: "studentId, fullName, phone, gradeLevel are required" });
    return;
  }

  const validGrades = ["grade9", "grade12_sci", "grade12_lit", "english", "ielts", "steps1000"];
  if (!validGrades.includes(gradeLevel)) {
    res.status(400).json({
      error: "validation_error",
      message: `gradeLevel must be one of: ${validGrades.join(", ")}`,
    });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.studentId, studentId))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ fullName, phone, gradeLevel: gradeLevel as any })
        .where(eq(usersTable.studentId, studentId))
        .returning();

      res.status(200).json({
        action: "updated",
        studentId: updated.studentId,
        fullName: updated.fullName,
        gradeLevel: updated.gradeLevel,
      });
      return;
    }

    const passwordHash = await hashPassword("123456");
    const email = `${studentId.toLowerCase()}@sync.najm-edu`;

    const [created] = await db
      .insert(usersTable)
      .values({
        studentId,
        email,
        passwordHash,
        fullName,
        phone,
        gradeLevel: gradeLevel as any,
        accessRole: "free",
        starsBalance: 0,
      })
      .returning();

    res.status(201).json({
      action: "created",
      studentId: created.studentId,
      fullName: created.fullName,
      gradeLevel: created.gradeLevel,
      defaultPassword: "123456",
    });
  } catch (error: any) {
    console.error("Sync Webhook Error:", error);
    res.status(500).json({ error: error.message });
  }
}

// ── Ping test route
app.get("/api/ping", (_req, res) => { res.send("PONG! Server is alive."); });
app.get("/ping", (_req, res) => { res.send("PONG! Server is alive."); });

// ── One-time production setup: creates admin + imports all students
// Protected by webhook secret. Safe to leave in — only runs if secret matches.
app.post("/api/setup/seed", async (req: express.Request, res: express.Response) => {
  const secret = (req.headers["x-webhook-secret"] as string) || (req.query.secret as string);
  if (!secret || secret !== (process.env.WEBHOOK_SECRET || "najm-webhook-secret-2024")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const results: string[] = [];
  let created = 0, updated = 0, errors = 0;

  const upsertStudent = async (studentId: string, fullName: string, phone: string, emailAddr: string, gradeLevel: string, role: string = "free") => {
    try {
      const [existing] = await db.select().from(usersTable).where(eq(usersTable.studentId, studentId)).limit(1);
      const passwordHash = await hashPassword("123456");
      if (existing) {
        await db.update(usersTable)
          .set({ fullName, phone, gradeLevel: gradeLevel as any, accessRole: role as any })
          .where(eq(usersTable.studentId, studentId));
        results.push(`↻ ${studentId} — ${fullName} (updated)`);
        updated++;
      } else {
        await db.insert(usersTable).values({
          studentId, email: emailAddr, passwordHash, fullName, phone,
          gradeLevel: gradeLevel as any, accessRole: role as any, starsBalance: 0,
        });
        results.push(`✓ ${studentId} — ${fullName} (created)`);
        created++;
      }
    } catch (e: any) {
      results.push(`✗ ${studentId} — ERROR: ${e.message}`);
      errors++;
    }
  };

  // Admin account — find by email first (handles existing users), then upsert
  try {
    const adminEmail = "abdullahnjm2024@gmail.com";
    const adminPwHash = await hashPassword("abdullahnjm2002");
    const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (existingAdmin) {
      await db.update(usersTable)
        .set({ studentId: "NJM-ADMIN", fullName: "عبد الله نجم", passwordHash: adminPwHash, accessRole: "admin" as any })
        .where(eq(usersTable.email, adminEmail));
      results.push(`↻ NJM-ADMIN — عبد الله نجم — promoted to admin (was ${existingAdmin.studentId})`);
      updated++;
    } else {
      const defaultHash = await hashPassword("123456");
      await db.insert(usersTable).values({
        studentId: "NJM-ADMIN", email: adminEmail, passwordHash: adminPwHash,
        fullName: "عبد الله نجم", phone: "938380741", gradeLevel: "grade9" as any, accessRole: "admin" as any, starsBalance: 0,
      });
      results.push(`✓ NJM-ADMIN — عبد الله نجم (created as admin)`);
      created++;
    }
  } catch (e: any) {
    results.push(`✗ NJM-ADMIN — ERROR: ${e.message}`);
    errors++;
  }

  // 18 students from CSV
  const students: [string, string, string, string][] = [
    ["G9-0001","عبد الله نجم","938380741","g9-0001@sync.najm-edu"],
    ["G9-0002","ليث نجم","990517445","laithnjm75@gmail.com"],
    ["G9-0003","أكرم نجم","936846999","akramnjm75@gmail.com"],
    ["G9-0004","ريم بكورة","957618962","reemba1245@gmail.com"],
    ["G9-0005","حلا الرفاعي","994615795","ayathala45@gmail.com"],
    ["G9-0006","يعقوب العذاب","96599717347","azyaqoub5@gmail.com"],
    ["G9-0007","رهف العلاوي","998438298","lawyryad093@gmail.com"],
    ["G9-0008","رغد الغدير","981863718","mhmd77ghader@gmail.com"],
    ["G9-0009","ليان حيدر","956637158","layanheidar70@gmail.com"],
    ["G9-0010","arwa alnajrs","992570455","sajaalnajrs9@gmail.com"],
    ["G9-0011","عليه الصالح الغدير","936425514","rbt6141@gmail.com"],
    ["G9-0012","ليان سلوم","951507481","layansy491@gmail.com"],
    ["G9-0013","حنان الصالح الغدير","985451295","snaaalkhadeer@gmail.com"],
    ["G9-0014","ماسة عطايا","939542831","atayamass4@gmail.com"],
    ["G9-0015","سلطان سليم","993172649","fyslslym74@gmail.com"],
    ["G9-0016","يوسف الغدير","945099060","alvexo2@gmail.com"],
    ["G9-0017","احمد شكر","954860882","chkrahmad39@gmail.com"],
    ["G9-0018","غيث العلبي","934611017","allbyghyth@gmail.com"],
  ];
  for (const [sid, name, phone, email] of students) {
    await upsertStudent(sid, name, phone, email, "grade9", "free");
  }

  res.json({
    message: "Production seeding complete",
    created, updated, errors, total: created + updated,
    details: results,
    adminNote: "Admin: studentId=NJM-ADMIN, email=abdullahnjm2024@gmail.com, password=abdullahnjm2002",
  });
});

// ── Emergency admin promotion — finds existing user by email and promotes to admin
app.post("/api/setup/promote-admin", async (req: express.Request, res: express.Response) => {
  const secret = (req.headers["x-webhook-secret"] as string) || (req.query.secret as string);
  if (!secret || secret !== (process.env.WEBHOOK_SECRET || "najm-webhook-secret-2024")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const adminEmail = "abdullahnjm2024@gmail.com";
    const adminPwHash = await hashPassword("abdullahnjm2002");
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
    if (!existing) {
      await db.insert(usersTable).values({
        studentId: "NJM-ADMIN", email: adminEmail, passwordHash: adminPwHash,
        fullName: "عبد الله نجم", phone: "938380741", gradeLevel: "grade9" as any, accessRole: "admin" as any, starsBalance: 0,
      });
      res.json({ success: true, action: "created", studentId: "NJM-ADMIN", message: "Admin account created" });
    } else {
      const oldId = existing.studentId;
      await db.update(usersTable)
        .set({ studentId: "NJM-ADMIN", fullName: "عبد الله نجم", passwordHash: adminPwHash, accessRole: "admin" as any })
        .where(eq(usersTable.email, adminEmail));
      res.json({ success: true, action: "promoted", previousStudentId: oldId, studentId: "NJM-ADMIN", message: "Existing account promoted to admin" });
    }
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Register on EVERY possible path variant so it works regardless of
// whether Replit's proxy strips the /api prefix or not
app.post("/api/sync", handleSyncStudent);
app.post("/api/webhook/sync-student", handleSyncStudent);
app.post("/sync", handleSyncStudent);
app.post("/webhook/sync-student", handleSyncStudent);

// ─────────────────────────────────────────────────────────────────────────────
// All other API routes
// ─────────────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─────────────────────────────────────────────────────────────────────────────
// Global JSON error handler — ensures all errors return JSON, never HTML
// ─────────────────────────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: "server_error",
    message: err.message || "Internal server error",
  });
});

export default app;
