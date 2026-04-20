import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getApiBaseUrl } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BookOpen, Lock, ChevronLeft, Loader2, PlayCircle, CheckCircle2,
  Headphones, FileText, Image, Link as LinkIcon, Layers, ChevronDown, ChevronUp,
  ClipboardList, AlertCircle, CreditCard
} from "lucide-react";

const API = getApiBaseUrl();
const tok = () => localStorage.getItem("najm_token") || "";
const authFetch = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json());

function useSubjects(gradeLevel: string) {
  return useQuery<any[]>({
    queryKey: ["subjects", gradeLevel],
    queryFn: () => authFetch(`${API}/subjects?gradeLevel=${gradeLevel}`),
    enabled: !!gradeLevel,
  });
}
function useUnits(subjectId: number | null) {
  return useQuery<any[]>({
    queryKey: ["units", subjectId],
    queryFn: () => authFetch(`${API}/units?subjectId=${subjectId}`),
    enabled: !!subjectId,
  });
}
function useUnitLessons(unitId: number | null) {
  return useQuery<any[]>({
    queryKey: ["unit-lessons", unitId],
    queryFn: () => authFetch(`${API}/units/${unitId}/lessons`),
    enabled: !!unitId,
  });
}
function useSubjectProgress(subjectId: number | null) {
  return useQuery<any>({
    queryKey: ["subject-progress", subjectId],
    queryFn: () => authFetch(`${API}/progress/subjects/${subjectId}`),
    enabled: !!subjectId,
  });
}

export default function Lessons() {
  const { user, isPaidForSubject } = useAuth();
  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;
  const qc = useQueryClient();

  const [activeSubject, setActiveSubject] = useState<any | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);

  const { data: subjects = [], isLoading: loadingSubjects } = useSubjects(grade);
  const { data: units = [], isLoading: loadingUnits } = useUnits(activeSubject?.id ?? null);
  const { data: lessons = [], isLoading: loadingLessons } = useUnitLessons(expandedUnit);
  const { data: subjectProgress } = useSubjectProgress(activeSubject?.id ?? null);

  const isSubjectPaid = activeSubject ? isPaidForSubject(activeSubject.id) : false;

  const markComplete = useMutation({
    mutationFn: (lessonId: number) =>
      fetch(`${API}/progress/lessons/${lessonId}`, { method: "POST", headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unit-lessons", expandedUnit] });
      qc.invalidateQueries({ queryKey: ["subject-progress", activeSubject?.id] });
    },
  });

  const completedLessons = subjectProgress?.completedLessons ?? 0;
  const totalLessons = subjectProgress?.totalLessons ?? 0;
  const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  if (loadingSubjects) return (
    <Layout>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-9 h-9 animate-spin" style={{ color: theme.primary }} />
      </div>
    </Layout>
  );

  if (!loadingSubjects && subjects.length === 0) {
    return (
      <Layout>
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-foreground">الدروس</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <img src={theme.logo} alt="" className="h-4 w-4 object-contain" />
            دروس {theme.labelAr}
          </p>
        </div>
        <div className="text-center py-20">
          <BookOpen className="w-14 h-14 mx-auto mb-4" style={{ color: theme.primary, opacity: 0.3 }} />
          <p className="text-muted-foreground text-sm">لم يتم إضافة مواد بعد. تابعنا قريباً!</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="text-xl font-extrabold text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
          الدروس
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          <img src={theme.logo} alt="" className="h-4 w-4 object-contain" />
          {theme.labelAr}
        </p>
      </div>

      {!activeSubject ? (
        <div>
          <p className="text-xs text-muted-foreground mb-3">اختر مادة للبدء</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((subject: any) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                theme={theme}
                isSubjectPaid={isPaidForSubject(subject.id)}
                onSelect={() => { setActiveSubject(subject); setExpandedUnit(null); }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-5">
            <button onClick={() => { setActiveSubject(null); setExpandedUnit(null); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              الدروس
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold text-foreground">{activeSubject.titleAr}</span>
          </div>

          <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-bold text-foreground">{activeSubject.titleAr}</h2>
                {activeSubject.descriptionAr && <p className="text-xs text-muted-foreground mt-0.5">{activeSubject.descriptionAr}</p>}
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground">{completedLessons} / {totalLessons} درس</p>
                <p className="font-bold text-sm" style={{ color: theme.primary }}>{progressPct}%</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, backgroundColor: theme.primary }} />
            </div>
          </div>

          {loadingUnits ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: theme.primary }} /></div>
          ) : units.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">لا توجد وحدات في هذه المادة بعد</p>
          ) : (
            <div className="space-y-3">
              {units.map((unit: any, unitIdx: number) => (
                <UnitPanel
                  key={unit.id}
                  unit={unit}
                  unitIdx={unitIdx}
                  theme={theme}
                  expanded={expandedUnit === unit.id}
                  onToggle={() => setExpandedUnit(expandedUnit === unit.id ? null : unit.id)}
                  lessons={expandedUnit === unit.id ? lessons : []}
                  loadingLessons={loadingLessons && expandedUnit === unit.id}
                  isSubjectPaid={isSubjectPaid}
                  onMarkComplete={(lessonId: number) => markComplete.mutate(lessonId)}
                  markingComplete={markComplete.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

function SubjectCard({ subject, theme, isSubjectPaid, onSelect }: { subject: any; theme: any; isSubjectPaid: boolean; onSelect: () => void }) {
  const isPaidSubject = subject.accessLevel === "paid";
  const isLocked = isPaidSubject && !isSubjectPaid;

  return (
    <button onClick={onSelect}
      className="text-right bg-card border border-card-border rounded-xl p-5 hover:border-primary/30 hover:shadow-md transition-all group w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary + "20" }}>
          <Layers className="w-5 h-5" style={{ color: theme.primary }} />
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
      </div>
      <h3 className="font-bold text-foreground text-base mb-1">{subject.titleAr}</h3>
      {subject.descriptionAr && <p className="text-xs text-muted-foreground line-clamp-2">{subject.descriptionAr}</p>}
      {isLocked && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <CreditCard className="w-3 h-3" /> مدفوع
        </span>
      )}
      {isPaidSubject && isSubjectPaid && (
        <span className="inline-flex items-center gap-1 mt-2 text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="w-3 h-3" /> مفعّل
        </span>
      )}
    </button>
  );
}

function UnitPanel({ unit, unitIdx, theme, expanded, onToggle, lessons, loadingLessons, isSubjectPaid, onMarkComplete, markingComplete }: any) {
  const completedCount = lessons.filter((l: any) => l.isCompleted).length;
  return (
    <div className="bg-card border border-card-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors text-right">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm text-white" style={{ backgroundColor: theme.primary }}>
          {unitIdx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm">{unit.titleAr}</h3>
          {unit.descriptionAr && <p className="text-xs text-muted-foreground truncate">{unit.descriptionAr}</p>}
        </div>
        {expanded && lessons.length > 0 && (
          <span className="text-xs text-muted-foreground ml-2">{completedCount}/{lessons.length}</span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {loadingLessons ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.primary }} /></div>
          ) : lessons.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">لا توجد دروس في هذه الوحدة</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson: any, idx: number) => (
                <LessonRow
                  key={lesson.id}
                  lesson={lesson}
                  idx={idx}
                  theme={theme}
                  isSubjectPaid={isSubjectPaid}
                  onMarkComplete={onMarkComplete}
                  markingComplete={markingComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonRow({ lesson, idx, theme, isSubjectPaid, onMarkComplete, markingComplete }: any) {
  const isPaymentLocked = lesson.accessLevel === "paid" && !isSubjectPaid;
  const isLocked = lesson.isLocked || isPaymentLocked;
  const isCompleted = lesson.isCompleted;
  const hasQuiz = !!lesson.quizId;
  const quizPassed = lesson.quizPassed;
  const bestScore = lesson.bestQuizScore;

  const statusColor = isCompleted
    ? "#10B981"
    : isLocked
    ? "#6B7280"
    : theme.primary;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isLocked ? "opacity-60 bg-muted/30" : "hover:bg-muted/30"}`}>
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: statusColor + "20" }}>
        {isCompleted
          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          : isLocked
          ? <Lock className="w-4 h-4 text-muted-foreground" />
          : <span className="text-xs font-bold" style={{ color: theme.primary }}>{idx + 1}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isLocked ? "text-muted-foreground" : "text-foreground"}`}>{lesson.titleAr}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {lesson.youtubeUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><PlayCircle className="w-3 h-3" /></span>}
          {lesson.audioUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Headphones className="w-3 h-3" /></span>}
          {lesson.richTextAr && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><FileText className="w-3 h-3" /></span>}
          {lesson.pdfUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><FileText className="w-3 h-3" /></span>}
          {lesson.imageUrl && <span className="flex items-center gap-0.5 text-xs text-muted-foreground"><Image className="w-3 h-3" /></span>}
          {hasQuiz && !isPaymentLocked && (
            <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: quizPassed ? "#10B98120" : bestScore !== null ? "#F59E0B20" : theme.primary + "15",
                color: quizPassed ? "#10B981" : bestScore !== null ? "#F59E0B" : theme.primary
              }}>
              <ClipboardList className="w-3 h-3" />
              {quizPassed ? `${bestScore}% ✓` : bestScore !== null ? `${bestScore}%` : "اختبار"}
            </span>
          )}
          {isPaymentLocked && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <CreditCard className="w-3 h-3" /> مدفوع
            </span>
          )}
        </div>
      </div>

      {!isLocked && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {isCompleted ? (
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> مكتمل
            </span>
          ) : hasQuiz && !quizPassed ? (
            <Link to={`/exams/${lesson.quizId}`}>
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: theme.primary }}>
                <ClipboardList className="w-3 h-3" />
                {bestScore !== null ? "أعد الاختبار" : "ابدأ الاختبار"}
              </button>
            </Link>
          ) : (
            <button
              onClick={() => onMarkComplete(lesson.id)}
              disabled={markingComplete}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={{ backgroundColor: theme.primary + "15", color: theme.primary }}
            >
              {markingComplete ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              إكمال
            </button>
          )}
          <Link to={`/lessons/${lesson.id}`}>
            <button className="flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground hover:text-foreground rounded-lg text-xs font-semibold transition-all">
              عرض
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
