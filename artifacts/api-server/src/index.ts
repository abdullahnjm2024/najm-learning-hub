import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { staffTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function seedSuperAdmin() {
  try {
    const existing = await db.select({ id: staffTable.id }).from(staffTable).where(eq(staffTable.adminId, "ADMIN-000")).limit(1);
    if (existing.length === 0) {
      const passwordHash = await hashPassword("admin");
      await db.insert(staffTable).values({
        adminId: "ADMIN-000",
        passwordHash,
        fullName: "المدير العام",
        role: "super_admin",
        assignedTracks: [],
        assignedSubjectIds: [],
        isActive: true,
      });
      logger.info("Default super admin ADMIN-000 created");
    }
  } catch (err) {
    logger.warn({ err }, "Could not seed super admin");
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  seedSuperAdmin();
});
