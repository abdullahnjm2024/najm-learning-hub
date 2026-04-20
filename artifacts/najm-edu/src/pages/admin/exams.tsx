import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useListExams, useCreateExam, useDeleteExam, getListExamsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GRADE_CONFIG } from "@/lib/utils";
import { FileText, Plus, Trash2, Loader2, X, Star, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiBaseUrl } from "@/lib/utils";

const examSchema = z.object({
  titleAr: z.string().min(1, "العنوان بالعربية مطلوب"),
  title: z.string().min(1, "العنوان بالإنجليزية مطلوب"),
  descriptionAr: z.string().optional(),
  description: z.string().optional(),
  googleFormUrl: z.string().url("رابط النموذج غير صالح"),
  gradeLevel: z.enum(["grade9", "grade12_sci", "grade12_lit", "english", "ielts", "steps1000"]),
  accessLevel: z.enum(["free", "paid"]),
  maxScore: z.number().int().min(1).default(100),
  starsReward: z.number().int().min(0).default(10),
  quizCode: z.string().optional(),
});

type ExamForm = z.infer<typeof examSchema>;

const API = getApiBaseUrl();
const staffTok = () => localStorage.getItem("najm_staff_token") || "";

const EMPTY_DEFAULTS: ExamForm = {
  titleAr: "", title: "", googleFormUrl: "",
  gradeLevel: "grade9", accessLevel: "free",
  maxScore: 100, starsReward: 10, quizCode: "",
};

export default function AdminExams() {
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: exams, isLoading } = useListExams({}, { query: { queryKey: getListExamsQueryKey({}) } });
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();

  const form = useForm<ExamForm>({
    resolver: zodResolver(examSchema),
    defaultValues: EMPTY_DEFAULTS,
  });

  const examList = Array.isArray(exams) ? exams : [];

  const openCreate = () => {
    form.reset(EMPTY_DEFAULTS);
    setEditingExam(null);
    setModalMode("create");
  };

  const openEdit = (exam: any) => {
    form.reset({
      titleAr: exam.titleAr ?? "",
      title: exam.title ?? "",
      descriptionAr: exam.descriptionAr ?? "",
      description: exam.description ?? "",
      googleFormUrl: exam.googleFormUrl ?? "",
      gradeLevel: exam.gradeLevel ?? "grade9",
      accessLevel: exam.accessLevel ?? "free",
      maxScore: exam.maxScore ?? 100,
      starsReward: exam.starsReward ?? 10,
      quizCode: exam.quizCode ?? "",
    });
    setEditingExam(exam);
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingExam(null);
    form.reset(EMPTY_DEFAULTS);
  };

  const onSubmit = async (data: ExamForm) => {
    const payload = {
      ...data,
      quizCode: data.quizCode?.trim() || undefined,
    };

    if (modalMode === "edit" && editingExam) {
      setSaving(true);
      try {
        const res = await fetch(`${API}/exams/${editingExam.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${staffTok()}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("فشل تحديث الاختبار");
        queryClient.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
        toast({ title: "تم تحديث الاختبار بنجاح" });
        closeModal();
      } catch {
        toast({ title: "خطأ", description: "فشل تحديث الاختبار", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
      createExam.mutate(
        { data: payload },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
            toast({ title: "تم إضافة الاختبار بنجاح" });
            closeModal();
          },
          onError: () => toast({ title: "خطأ", description: "فشل إضافة الاختبار", variant: "destructive" }),
        }
      );
    }
  };

  const handleDelete = (id: number, title: string) => {
    if (!confirm(`هل تريد حذف اختبار "${title}"؟`)) return;
    deleteExam.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExamsQueryKey({}) });
        toast({ title: "تم حذف الاختبار" });
      },
    });
  };

  const isPending = saving || createExam.isPending;

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة الاختبارات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{examList.length} اختبار</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          data-testid="btn-add-exam"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة اختبار</span>
        </button>
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">
                {modalMode === "edit" ? `تعديل: ${editingExam?.titleAr}` : "إضافة اختبار جديد"}
              </h2>
              <button onClick={closeModal}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">عنوان الاختبار بالعربية</label>
                <input {...form.register("titleAr")} placeholder="اختبار الوحدة الأولى" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="input-titleAr" />
                {form.formState.errors.titleAr && <p className="text-destructive text-xs mt-1">{form.formState.errors.titleAr.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">العنوان بالإنجليزية</label>
                <input {...form.register("title")} placeholder="Unit 1 Exam" className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ltr" dir="ltr" data-testid="input-title" />
                {form.formState.errors.title && <p className="text-destructive text-xs mt-1">{form.formState.errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">رابط Google Form</label>
                <input {...form.register("googleFormUrl")} placeholder="https://docs.google.com/forms/d/..." className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ltr" dir="ltr" data-testid="input-googleFormUrl" />
                {form.formState.errors.googleFormUrl && <p className="text-destructive text-xs mt-1">{form.formState.errors.googleFormUrl.message}</p>}
              </div>

              {/* Quiz Code — highlighted prominently in edit mode */}
              <div className={modalMode === "edit" ? "p-3 rounded-xl border-2 border-primary/30 bg-primary/5" : ""}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  رمز الاختبار <span className="text-muted-foreground font-normal">(Quiz Code)</span>
                  {modalMode === "edit" && <span className="mr-2 text-xs text-primary font-semibold">← أهم حقل</span>}
                </label>
                <input
                  {...form.register("quizCode")}
                  placeholder="G9_G_01"
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ltr font-mono"
                  dir="ltr"
                  data-testid="input-quizCode"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يجب أن يطابق رمز الاختبار في Google Sheet (العمود D) حتى تعمل الدرجات التلقائية.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المرحلة</label>
                  <select {...form.register("gradeLevel")} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="select-gradelevel">
                    {Object.entries(GRADE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.labelAr}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الصلاحية</label>
                  <select {...form.register("accessLevel")} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="select-accesslevel">
                    <option value="free">مجاني</option>
                    <option value="paid">مدفوع</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">أعلى درجة</label>
                  <input type="number" {...form.register("maxScore", { valueAsNumber: true })} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ltr text-center" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">مكافأة النجوم</label>
                  <input type="number" {...form.register("starsReward", { valueAsNumber: true })} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring ltr text-center" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">إلغاء</button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                  data-testid="btn-save-exam"
                >
                  {isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <span>{modalMode === "edit" ? "حفظ التغييرات" : "إضافة"}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : examList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد اختبارات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {examList.map((exam: any) => {
            const cfg = GRADE_CONFIG[exam.gradeLevel];
            return (
              <div key={exam.id} className="flex items-center gap-3 bg-card border border-card-border rounded-xl p-4" data-testid={`exam-row-${exam.id}`}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg?.primaryLight }}>
                  <FileText className="w-4 h-4" style={{ color: cfg?.primary }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exam.titleAr}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: cfg?.primary }}>{cfg?.labelAr}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <Star className="w-3 h-3 fill-current text-primary" />
                    <span className="text-xs text-muted-foreground">{exam.starsReward} نجمة</span>
                    <span className="text-xs text-muted-foreground">• {exam.accessLevel === "paid" ? "مدفوع" : "مجاني"}</span>
                    {exam.quizCode ? (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{exam.quizCode}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-amber-500 font-medium">بدون رمز</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(exam)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                    data-testid={`btn-edit-exam-${exam.id}`}
                    title="تعديل"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(exam.id, exam.titleAr)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    data-testid={`btn-delete-exam-${exam.id}`}
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
