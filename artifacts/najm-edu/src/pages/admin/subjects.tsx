import { useState } from "react";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  BookOpen, Plus, Trash2, Loader2, X, ChevronDown, ChevronRight,
  Layers, FileText, GripVertical, ArrowUp, ArrowDown, Edit2, Save,
  PlayCircle, Headphones, Image, Type, Link as LinkIcon
} from "lucide-react";

const API = getApiBaseUrl();
const tok = () => localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token") || "";
const authFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok()}`, ...opts.headers } });

const GRADES = Object.entries(GRADE_CONFIG).map(([key, cfg]) => ({ key, labelAr: cfg.labelAr, primary: cfg.primary }));

const GRADE_OPTIONS = [
  { key: "grade9", labelAr: "الصف التاسع" },
  { key: "grade12_sci", labelAr: "بكالوريا علمي" },
  { key: "grade12_lit", labelAr: "بكالوريا أدبي" },
  { key: "english", labelAr: "اللغة الإنجليزية" },
  { key: "ielts", labelAr: "تحضير الآيلتس" },
  { key: "steps1000", labelAr: "مشروع 1000 خطوة" },
];

function useSubjects(gradeLevel: string) {
  return useQuery<any[]>({
    queryKey: ["subjects", gradeLevel],
    queryFn: () => authFetch(`${API}/subjects?gradeLevel=${gradeLevel}`).then(r => r.json()),
    enabled: !!gradeLevel,
  });
}
function useUnits(subjectId: number | null) {
  return useQuery<any[]>({
    queryKey: ["units", subjectId],
    queryFn: () => authFetch(`${API}/units?subjectId=${subjectId}`).then(r => r.json()),
    enabled: !!subjectId,
  });
}
function useUnitLessons(unitId: number | null) {
  return useQuery<any[]>({
    queryKey: ["unit-lessons", unitId],
    queryFn: () => authFetch(`${API}/units/${unitId}/lessons`).then(r => r.json()),
    enabled: !!unitId,
  });
}
function useExams() {
  return useQuery<any[]>({
    queryKey: ["exams-for-link"],
    queryFn: () => authFetch(`${API}/exams`).then(r => r.json()),
  });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-foreground text-base">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const label = "block text-sm font-medium text-foreground mb-1";

export default function AdminSubjects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [gradeFilter, setGradeFilter] = useState("grade9");
  const [activeSubject, setActiveSubject] = useState<any | null>(null);
  const [activeUnit, setActiveUnit] = useState<any | null>(null);

  const [subjectModal, setSubjectModal] = useState<"create" | "edit" | null>(null);
  const [unitModal, setUnitModal] = useState<"create" | "edit" | null>(null);
  const [lessonModal, setLessonModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; item: any } | null>(null);

  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects(gradeFilter);
  const { data: units = [], isLoading: loadingUnits } = useUnits(activeSubject?.id ?? null);
  const { data: lessons = [], isLoading: loadingLessons } = useUnitLessons(activeUnit?.id ?? null);
  const { data: exams = [] } = useExams();

  const invalidate = (keys: string[][]) => keys.forEach(k => qc.invalidateQueries({ queryKey: k }));

  const createSubject = useMutation({
    mutationFn: (data: any) => authFetch(`${API}/subjects`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["subjects", gradeFilter]]); setSubjectModal(null); toast({ title: "تم إنشاء المادة" }); },
    onError: () => toast({ title: "خطأ", description: "فشل إنشاء المادة", variant: "destructive" }),
  });
  const updateSubject = useMutation({
    mutationFn: ({ id, data }: any) => authFetch(`${API}/subjects/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["subjects", gradeFilter]]); setSubjectModal(null); toast({ title: "تم تحديث المادة" }); },
  });
  const deleteSubject = useMutation({
    mutationFn: (id: number) => authFetch(`${API}/subjects/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate([["subjects", gradeFilter]]); setActiveSubject(null); setActiveUnit(null); setDeleteConfirm(null); toast({ title: "تم حذف المادة" }); },
  });

  const createUnit = useMutation({
    mutationFn: (data: any) => authFetch(`${API}/units`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["units", activeSubject?.id]]); setUnitModal(null); toast({ title: "تم إنشاء الوحدة" }); },
    onError: () => toast({ title: "خطأ", description: "فشل إنشاء الوحدة", variant: "destructive" }),
  });
  const updateUnit = useMutation({
    mutationFn: ({ id, data }: any) => authFetch(`${API}/units/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["units", activeSubject?.id]]); setUnitModal(null); toast({ title: "تم تحديث الوحدة" }); },
  });
  const deleteUnit = useMutation({
    mutationFn: (id: number) => authFetch(`${API}/units/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate([["units", activeSubject?.id]]); setActiveUnit(null); setDeleteConfirm(null); toast({ title: "تم حذف الوحدة" }); },
  });

  const createLesson = useMutation({
    mutationFn: (data: any) => authFetch(`${API}/lessons`, { method: "POST", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["unit-lessons", activeUnit?.id]]); setLessonModal(null); toast({ title: "تم إنشاء الدرس" }); },
    onError: () => toast({ title: "خطأ", description: "فشل إنشاء الدرس", variant: "destructive" }),
  });
  const updateLesson = useMutation({
    mutationFn: ({ id, data }: any) => authFetch(`${API}/lessons/${id}`, { method: "PUT", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { invalidate([["unit-lessons", activeUnit?.id]]); setLessonModal(null); toast({ title: "تم تحديث الدرس" }); },
  });
  const deleteLesson = useMutation({
    mutationFn: (id: number) => authFetch(`${API}/lessons/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate([["unit-lessons", activeUnit?.id]]); setDeleteConfirm(null); toast({ title: "تم حذف الدرس" }); },
  });

  const moveItem = async (items: any[], idx: number, dir: -1 | 1, type: "subject" | "unit" | "lesson") => {
    const target = items[idx + dir];
    const current = items[idx];
    if (!target) return;
    const [aIdx, bIdx] = [current.orderIndex, target.orderIndex];
    if (type === "subject") {
      await Promise.all([
        authFetch(`${API}/subjects/${current.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: bIdx }) }),
        authFetch(`${API}/subjects/${target.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: aIdx }) }),
      ]);
      invalidate([["subjects", gradeFilter]]);
    } else if (type === "unit") {
      await Promise.all([
        authFetch(`${API}/units/${current.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: bIdx }) }),
        authFetch(`${API}/units/${target.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: aIdx }) }),
      ]);
      invalidate([["units", activeSubject?.id]]);
    } else {
      await Promise.all([
        authFetch(`${API}/lessons/${current.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: bIdx }) }),
        authFetch(`${API}/lessons/${target.id}`, { method: "PUT", body: JSON.stringify({ orderIndex: aIdx }) }),
      ]);
      invalidate([["unit-lessons", activeUnit?.id]]);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">إدارة المواد (LMS v2.0)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">المواد → الوحدات → الدروس</p>
      </div>

      {/* Grade filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {GRADE_OPTIONS.map(g => (
          <button key={g.key}
            onClick={() => { setGradeFilter(g.key); setActiveSubject(null); setActiveUnit(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${gradeFilter === g.key ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/60"}`}
            style={gradeFilter === g.key ? { backgroundColor: GRADE_CONFIG[g.key]?.primary } : {}}
          >{g.labelAr}</button>
        ))}
      </div>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Subjects */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5"><Layers className="w-4 h-4 text-primary" /> المواد</h3>
            <button onClick={() => { setEditTarget(null); setSubjectModal("create"); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
              <Plus className="w-3 h-3" /> مادة
            </button>
          </div>
          {loadingSubjects ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : subjects.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">لا توجد مواد — أنشئ واحدة</p>
            : subjects.map((sub, idx) => (
              <div key={sub.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg mb-1.5 cursor-pointer transition-all border ${activeSubject?.id === sub.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/50"}`}
                onClick={() => { setActiveSubject(sub); setActiveUnit(null); }}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sub.titleAr}</p>
                  <p className="text-xs text-muted-foreground">{GRADE_CONFIG[sub.gradeLevel]?.labelAr}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); moveItem(subjects, idx, -1, "subject"); }} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); moveItem(subjects, idx, 1, "subject"); }} disabled={idx === subjects.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); setEditTarget(sub); setSubjectModal("edit"); }} className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: "subject", item: sub }); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
        </div>

        {/* Column 2: Units */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" /> الوحدات</h3>
            {activeSubject && (
              <button onClick={() => { setEditTarget(null); setUnitModal("create"); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
                <Plus className="w-3 h-3" /> وحدة
              </button>
            )}
          </div>
          {!activeSubject ? <p className="text-xs text-muted-foreground text-center py-8">اختر مادة أولاً</p>
            : loadingUnits ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : units.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">لا توجد وحدات — أنشئ واحدة</p>
            : units.map((unit, idx) => (
              <div key={unit.id}
                className={`flex items-center gap-2 p-2.5 rounded-lg mb-1.5 cursor-pointer transition-all border ${activeUnit?.id === unit.id ? "bg-primary/10 border-primary/30" : "border-transparent hover:bg-muted/50"}`}
                onClick={() => setActiveUnit(unit)}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{unit.titleAr}</p>
                  <p className="text-xs text-muted-foreground">{unit.title}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={e => { e.stopPropagation(); moveItem(units, idx, -1, "unit"); }} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); moveItem(units, idx, 1, "unit"); }} disabled={idx === units.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); setEditTarget(unit); setUnitModal("edit"); }} className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: "unit", item: unit }); }} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
        </div>

        {/* Column 3: Lessons */}
        <div className="bg-card border border-card-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5"><FileText className="w-4 h-4 text-primary" /> الدروس</h3>
            {activeUnit && (
              <button onClick={() => { setEditTarget(null); setLessonModal("create"); }}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90">
                <Plus className="w-3 h-3" /> درس
              </button>
            )}
          </div>
          {!activeUnit ? <p className="text-xs text-muted-foreground text-center py-8">اختر وحدة أولاً</p>
            : loadingLessons ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : lessons.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">لا توجد دروس — أضف درساً</p>
            : lessons.map((lesson: any, idx: number) => (
              <div key={lesson.id} className="flex items-start gap-2 p-2.5 rounded-lg mb-1.5 border border-transparent hover:bg-muted/50 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-bold text-primary">#{idx + 1}</span>
                    <p className="text-sm font-medium text-foreground truncate">{lesson.titleAr}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {lesson.youtubeUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><PlayCircle className="w-3 h-3" /> فيديو</span>}
                    {lesson.audioUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Headphones className="w-3 h-3" /> صوت</span>}
                    {lesson.richTextAr && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Type className="w-3 h-3" /> نص</span>}
                    {lesson.imageUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Image className="w-3 h-3" /> صورة</span>}
                    {lesson.pdfUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><FileText className="w-3 h-3" /> PDF</span>}
                    {lesson.quizId && <span className="flex items-center gap-0.5 text-xs text-primary"><LinkIcon className="w-3 h-3" /> اختبار 70%</span>}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => moveItem(lessons, idx, -1, "lesson")} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                  <button onClick={() => moveItem(lessons, idx, 1, "lesson")} disabled={idx === lessons.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                  <button onClick={() => { setEditTarget(lesson); setLessonModal("edit"); }} className="p-1 text-muted-foreground hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteConfirm({ type: "lesson", item: lesson })} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Subject Modal */}
      {subjectModal && (
        <SubjectFormModal
          mode={subjectModal}
          initial={editTarget}
          gradeFilter={gradeFilter}
          onClose={() => setSubjectModal(null)}
          onSave={(data: any) => {
            if (subjectModal === "create") createSubject.mutate({ ...data, gradeLevel: gradeFilter });
            else updateSubject.mutate({ id: editTarget.id, data });
          }}
          isPending={createSubject.isPending || updateSubject.isPending}
        />
      )}

      {/* Unit Modal */}
      {unitModal && activeSubject && (
        <UnitFormModal
          mode={unitModal}
          initial={editTarget}
          onClose={() => setUnitModal(null)}
          onSave={(data: any) => {
            if (unitModal === "create") createUnit.mutate({ ...data, subjectId: activeSubject.id });
            else updateUnit.mutate({ id: editTarget.id, data });
          }}
          isPending={createUnit.isPending || updateUnit.isPending}
        />
      )}

      {/* Lesson Modal */}
      {lessonModal && activeUnit && (
        <LessonFormModal
          mode={lessonModal}
          initial={editTarget}
          exams={exams}
          gradeLevel={activeSubject?.gradeLevel ?? "grade9"}
          onClose={() => setLessonModal(null)}
          onSave={(data: any) => {
            if (lessonModal === "create") createLesson.mutate({ ...data, unitId: activeUnit.id, gradeLevel: activeSubject?.gradeLevel ?? "" });
            else updateLesson.mutate({ id: editTarget.id, data });
          }}
          isPending={createLesson.isPending || updateLesson.isPending}
        />
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <Modal title="تأكيد الحذف" onClose={() => setDeleteConfirm(null)}>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">هل أنت متأكد من حذف:</p>
            <p className="font-bold text-foreground text-base mb-6">"{deleteConfirm.item.titleAr}"</p>
            <p className="text-xs text-destructive mb-6 bg-destructive/10 px-3 py-2 rounded-lg">
              {deleteConfirm.type === "subject" ? "سيتم حذف جميع الوحدات والدروس داخل هذه المادة" :
               deleteConfirm.type === "unit" ? "سيتم حذف جميع الدروس داخل هذه الوحدة" :
               "سيتم حذف هذا الدرس نهائياً"}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm">إلغاء</button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === "subject") deleteSubject.mutate(deleteConfirm.item.id);
                  else if (deleteConfirm.type === "unit") deleteUnit.mutate(deleteConfirm.item.id);
                  else deleteLesson.mutate(deleteConfirm.item.id);
                }}
                disabled={deleteSubject.isPending || deleteUnit.isPending || deleteLesson.isPending}
                className="flex-1 py-2.5 bg-destructive text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              >حذف</button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

function SubjectFormModal({ mode, initial, gradeFilter, onClose, onSave, isPending }: any) {
  const [form, setForm] = useState({ titleAr: initial?.titleAr ?? "", title: initial?.title ?? "", descriptionAr: initial?.descriptionAr ?? "", description: initial?.description ?? "", accessLevel: initial?.accessLevel ?? "free", orderIndex: initial?.orderIndex ?? 0 });
  return (
    <Modal title={mode === "create" ? "مادة جديدة" : "تعديل المادة"} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={label}>العنوان بالعربية *</label><input className={inp} value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} placeholder="مثال: الرياضيات" /></div>
        <div><label className={label}>العنوان بالإنجليزية</label><input className={inp + " ltr"} dir="ltr" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Mathematics" /></div>
        <div><label className={label}>الوصف (اختياري)</label><textarea className={inp} rows={2} value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}>الصلاحية</label>
            <select className={inp} value={form.accessLevel} onChange={e => setForm(p => ({ ...p, accessLevel: e.target.value }))}>
              <option value="free">مجاني</option><option value="paid">مدفوع</option>
            </select>
          </div>
          <div><label className={label}>الترتيب</label><input type="number" className={inp + " ltr"} value={form.orderIndex} onChange={e => setForm(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.titleAr || isPending} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </button>
        </div>
      </div>
    </Modal>
  );
}

function UnitFormModal({ mode, initial, onClose, onSave, isPending }: any) {
  const [form, setForm] = useState({ titleAr: initial?.titleAr ?? "", title: initial?.title ?? "", descriptionAr: initial?.descriptionAr ?? "", orderIndex: initial?.orderIndex ?? 0 });
  return (
    <Modal title={mode === "create" ? "وحدة جديدة" : "تعديل الوحدة"} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={label}>العنوان بالعربية *</label><input className={inp} value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} placeholder="مثال: الوحدة الأولى" /></div>
        <div><label className={label}>العنوان بالإنجليزية</label><input className={inp + " ltr"} dir="ltr" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Unit One" /></div>
        <div><label className={label}>الوصف (اختياري)</label><textarea className={inp} rows={2} value={form.descriptionAr} onChange={e => setForm(p => ({ ...p, descriptionAr: e.target.value }))} /></div>
        <div><label className={label}>الترتيب</label><input type="number" className={inp + " ltr"} value={form.orderIndex} onChange={e => setForm(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))} /></div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm">إلغاء</button>
          <button onClick={() => onSave(form)} disabled={!form.titleAr || isPending} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </button>
        </div>
      </div>
    </Modal>
  );
}

function LessonFormModal({ mode, initial, exams, gradeLevel, onClose, onSave, isPending }: any) {
  const [form, setForm] = useState({
    titleAr: initial?.titleAr ?? "",
    title: initial?.title ?? "",
    descriptionAr: initial?.descriptionAr ?? "",
    youtubeUrl: initial?.youtubeUrl ?? "",
    audioUrl: initial?.audioUrl ?? "",
    imageUrl: initial?.imageUrl ?? "",
    pdfUrl: initial?.pdfUrl ?? "",
    richTextAr: initial?.richTextAr ?? "",
    richText: initial?.richText ?? "",
    quizId: initial?.quizId ?? "",
    accessLevel: initial?.accessLevel ?? "free",
    orderIndex: initial?.orderIndex ?? 0,
  });

  return (
    <Modal title={mode === "create" ? "درس جديد" : "تعديل الدرس"} onClose={onClose}>
      <div className="space-y-3">
        <div><label className={label}>العنوان بالعربية *</label><input className={inp} value={form.titleAr} onChange={e => setForm(p => ({ ...p, titleAr: e.target.value }))} placeholder="مثال: الدرس الأول - المقدمة" /></div>
        <div><label className={label}>العنوان بالإنجليزية</label><input className={inp + " ltr"} dir="ltr" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Lesson 1 - Introduction" /></div>

        <div className="border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">المحتوى المتعدد (اختياري)</p>
          <div><label className={label}><PlayCircle className="w-3.5 h-3.5 inline ml-1 text-primary" />رابط يوتيوب</label>
            <input className={inp + " ltr"} dir="ltr" value={form.youtubeUrl} onChange={e => setForm(p => ({ ...p, youtubeUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
          <div><label className={label}><Headphones className="w-3.5 h-3.5 inline ml-1 text-primary" />رابط ملف صوتي</label>
            <input className={inp + " ltr"} dir="ltr" value={form.audioUrl} onChange={e => setForm(p => ({ ...p, audioUrl: e.target.value }))} placeholder="https://..." /></div>
          <div><label className={label}><Image className="w-3.5 h-3.5 inline ml-1 text-primary" />رابط صورة</label>
            <input className={inp + " ltr"} dir="ltr" value={form.imageUrl} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." /></div>
          <div><label className={label}><FileText className="w-3.5 h-3.5 inline ml-1 text-primary" />رابط ملف PDF</label>
            <input className={inp + " ltr"} dir="ltr" value={form.pdfUrl} onChange={e => setForm(p => ({ ...p, pdfUrl: e.target.value }))} placeholder="https://.../file.pdf" /></div>
          <div>
            <label className={label}><Type className="w-3.5 h-3.5 inline ml-1 text-primary" />محتوى نصي بالعربية (WYSIWYG)</label>
            <RichTextEditor
              value={form.richTextAr}
              onChange={html => setForm(p => ({ ...p, richTextAr: html }))}
              dir="rtl"
              placeholder="اكتب شرح الدرس هنا..."
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className={label}><LinkIcon className="w-3.5 h-3.5 inline ml-1 text-primary" />اختبار مرتبط (بوابة 70%)</label>
            <select className={inp} value={form.quizId} onChange={e => setForm(p => ({ ...p, quizId: e.target.value }))}>
              <option value="">بدون اختبار</option>
              {(exams as any[]).map((ex: any) => <option key={ex.id} value={ex.id}>{ex.titleAr}</option>)}
            </select>
          </div>
          <div><label className={label}>الصلاحية</label>
            <select className={inp} value={form.accessLevel} onChange={e => setForm(p => ({ ...p, accessLevel: e.target.value }))}>
              <option value="free">مجاني</option><option value="paid">مدفوع</option>
            </select>
          </div>
        </div>
        <div><label className={label}>الترتيب</label><input type="number" className={inp + " ltr"} value={form.orderIndex} onChange={e => setForm(p => ({ ...p, orderIndex: parseInt(e.target.value) || 0 }))} /></div>

        {form.quizId && (
          <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
            <p className="text-xs text-amber-700 dark:text-amber-300">الطالب لن يتمكن من إكمال هذا الدرس حتى يحصل على 70% أو أكثر في الاختبار المرتبط.</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm">إلغاء</button>
          <button onClick={() => onSave({ ...form, quizId: form.quizId ? parseInt(form.quizId as string) : null, pdfUrl: form.pdfUrl || null })} disabled={!form.titleAr || isPending}
            className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </button>
        </div>
      </div>
    </Modal>
  );
}
