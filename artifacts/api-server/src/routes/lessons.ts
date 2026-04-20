import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { lessonsTable, unitsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { authenticateAny, authenticateStaff, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();

const LessonBodyV2 = z.object({
  title: z.string().min(1).default(""),
  titleAr: z.string().min(1),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  youtubeUrl: z.string().optional(),
  gradeLevel: z.string().optional().default(""),
  accessLevel: z.enum(["free", "paid"]).default("free"),
  section: z.string().optional(),
  orderIndex: z.number().int().default(0),
  unitId: z.number().int().optional().nullable(),
  audioUrl: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  richText: z.string().optional().nullable(),
  richTextAr: z.string().optional().nullable(),
  quizId: z.number().int().optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
});

router.get("/lessons", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const { gradeLevel, accessLevel, section } = req.query as Record<string, string>;
  const conditions = [];
  if (gradeLevel) conditions.push(eq(lessonsTable.gradeLevel, gradeLevel));
  if (accessLevel) conditions.push(eq(lessonsTable.accessLevel, accessLevel as any));
  if (section) conditions.push(eq(lessonsTable.section, section));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const lessons = await db.select().from(lessonsTable).where(whereClause).orderBy(asc(lessonsTable.orderIndex));
  res.json(lessons);
});

router.post("/lessons", authenticateStaff, async (req: AuthenticatedRequest, res) => {
  const parsed = LessonBodyV2.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [lesson] = await db.insert(lessonsTable).values({
    title: data.title,
    titleAr: data.titleAr,
    description: data.description,
    descriptionAr: data.descriptionAr,
    youtubeUrl: data.youtubeUrl,
    gradeLevel: data.gradeLevel ?? "",
    accessLevel: data.accessLevel as any,
    section: data.section,
    orderIndex: data.orderIndex,
    unitId: data.unitId,
    audioUrl: data.audioUrl,
    imageUrl: data.imageUrl,
    richText: data.richText,
    richTextAr: data.richTextAr,
    quizId: data.quizId,
    pdfUrl: data.pdfUrl,
  }).returning();
  res.status(201).json(lesson);
});

router.get("/lessons/:id", authenticateAny, async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request", message: "Invalid ID" }); return; }
  const [lesson] = await db.select().from(lessonsTable).where(eq(lessonsTable.id, id)).limit(1);
  if (!lesson) { res.status(404).json({ error: "not_found", message: "Lesson not found" }); return; }

  // Access control: paid lesson requested by a student (req.user set, req.staff not set)
  if (lesson.accessLevel === "paid" && req.user && !req.staff) {
    const paidSubjectIds: number[] = req.user.paidSubjectIds ?? [];
    if (lesson.unitId) {
      const [unit] = await db
        .select({ subjectId: unitsTable.subjectId })
        .from(unitsTable)
        .where(eq(unitsTable.id, lesson.unitId))
        .limit(1);
      if (unit && !paidSubjectIds.includes(unit.subjectId)) {
        res.status(403).json({ error: "forbidden", message: "هذا الدرس متاح للمشتركين فقط" });
        return;
      }
    }
  }

  res.json(lesson);
});

router.put("/lessons/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request", message: "Invalid ID" }); return; }
  const parsed = LessonBodyV2.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_error", message: parsed.error.message }); return; }
  const [lesson] = await db.update(lessonsTable).set({
    ...parsed.data,
    accessLevel: parsed.data.accessLevel as any,
  }).where(eq(lessonsTable.id, id)).returning();
  if (!lesson) { res.status(404).json({ error: "not_found", message: "Lesson not found" }); return; }
  res.json(lesson);
});

router.delete("/lessons/:id", authenticateStaff, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "bad_request", message: "Invalid ID" }); return; }
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  res.status(204).end();
});

export default router;
