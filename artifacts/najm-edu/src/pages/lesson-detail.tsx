import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getYouTubeEmbedUrl, getApiBaseUrl } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Lock, Loader2, ChevronLeft, PlayCircle, Headphones, FileText,
  Image as ImageIcon, ClipboardList, CheckCircle2, AlertCircle, ExternalLink,
  X, RefreshCw
} from "lucide-react";
import { Link } from "wouter";

interface Props { params: { id: string } }

const API = getApiBaseUrl();
const tok = () => localStorage.getItem("najm_token") || "";
const authFetch = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => {
    if (!r.ok) throw new Error("not found");
    return r.json();
  });

export default function LessonDetail({ params }: Props) {
  const { isPaid, user } = useAuth();
  const { toast } = useToast();
  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;
  const lessonId = parseInt(params.id);
  const qc = useQueryClient();

  const [showExamModal, setShowExamModal] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [localScore, setLocalScore] = useState<number | null>(null);
  const [localPassed, setLocalPassed] = useState(false);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => authFetch(`${API}/lessons/${lessonId}`),
    enabled: !isNaN(lessonId),
  });

  const lessonData = lesson as any;
  const hasQuiz = !!(lessonData?.quizId);

  const { data: progressData } = useQuery({
    queryKey: ["lesson-progress-detail", lessonId],
    queryFn: () =>
      authFetch(`${API}/units/${lessonData?.unitId}/lessons`).then(
        (list: any[]) => list.find((l: any) => l.id === lessonId)
      ),
    enabled: !isNaN(lessonId) && !!lessonData?.unitId,
  });

  const { data: examData } = useQuery({
    queryKey: ["exam", lessonData?.quizId],
    queryFn: () => authFetch(`${API}/exams/${lessonData?.quizId}`),
    enabled: hasQuiz,
  });

  const markComplete = useMutation({
    mutationFn: () =>
      fetch(`${API}/progress/lessons/${lessonId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${tok()}` },
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unit-lessons"] });
      qc.invalidateQueries({ queryKey: ["subject-progress"] });
      qc.invalidateQueries({ queryKey: ["lesson-progress-detail", lessonId] });
    },
  });

  const handleVerifyScore = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(`${API}/exam-attempts/${lessonData.quizId}/best`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });

      if (res.status === 404) {
        toast({
          title: "لم يتم تسجيل درجتك بعد",
          description: "تأكد من إكمال النموذج والانتظار قليلاً ثم حاول مجدداً",
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) throw new Error("server_error");

      const attempt = await res.json();
      const pct = attempt.maxScore > 0
        ? Math.round((attempt.score / attempt.maxScore) * 100)
        : 0;

      // ── المنطق الذكي الجديد للتفريق بين أول نجاح والمراجعة ──
      const previousBest = progressData?.bestQuizScore ?? 0;
      const wasAlreadyPassed = progressData?.quizPassed ?? false;

      setLocalScore(pct);

      if (pct >= 70) {
        setLocalPassed(true);
        setShowExamModal(false);

        // هنا نحدد الرسالة المناسبة بناءً على حالة الطالب
        if (pct > previousBest && previousBest > 0) {
          toast({
            title: "رقم قياسي جديد! 🌟",
            description: `أحسنت! لقد رفعت نتيجتك إلى ${pct}%`,
          });
        } else if (wasAlreadyPassed) {
          toast({
            title: "تم استلام المراجعة 📝",
            description: `ستصلك نتيجتك الحالية في إشعار. (أفضل نتيجة محفوظة لك هي ${pct}%)`,
          });
        } else {
          toast({
            title: "أحسنت! اجتزت الاختبار 🎉",
            description: `درجتك ${pct}% — يمكنك الآن إكمال الدرس`,
          });
        }

        qc.invalidateQueries({ queryKey: ["lesson-progress-detail", lessonId] });
      } else {
        toast({
          title: `درجتك ${pct}%`,
          description: "تحتاج 70% أو أكثر للاجتياز. راجع الدرس وأعد المحاولة!",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "خطأ في التحقق",
        description: "تعذّر التحقق من الدرجة، حاول مجدداً",
        variant: "destructive",
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primary }} />
            <span className="text-muted-foreground text-sm">جاري تحميل الدرس...</span>
          </div>
        </div>
      </Layout>
    );
  }

  if (!lesson) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-foreground font-semibold mb-2">الدرس غير موجود</p>
          <Link href="/lessons" className="text-sm hover:underline" style={{ color: theme.primary }}>العودة للدروس</Link>
        </div>
      </Layout>
    );
  }

  const isAccessLocked = lessonData.accessLevel === "paid" && !isPaid;
  const hasVideo = !!lessonData.youtubeUrl;
  const hasAudio = !!lessonData.audioUrl;
  const hasImage = !!lessonData.imageUrl;
  const hasRichText = !!(lessonData.richTextAr || lessonData.richText);
  const hasPdf = !!lessonData.pdfUrl;

  const isCompleted = progressData?.isCompleted ?? false;
  const isProgressLocked = progressData?.isLocked ?? false;
  const bestQuizScore = localScore ?? (progressData?.bestQuizScore ?? null);
  const quizPassed = localPassed || (progressData?.quizPassed ?? false);
  const canComplete = !hasQuiz || quizPassed;

  const googleFormUrl = (examData as any)?.googleFormUrl ?? null;

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/lessons" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /><span>الدروس</span>
        </Link>
        <div
          className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, rgba(244,246,255,0.5) 100%)` }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.primaryLight }}>
            {hasVideo
              ? <PlayCircle className="w-6 h-6" style={{ color: theme.primary }} />
              : hasAudio
              ? <Headphones className="w-6 h-6" style={{ color: theme.primary }} />
              : <FileText className="w-6 h-6" style={{ color: theme.primary }} />}
          </div>
          <div className="flex-1 min-w-0">
            <h1
              className="text-xl font-extrabold text-foreground leading-tight"
              style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
            >
              {lessonData.titleAr}
            </h1>
            {lessonData.title && (
              <p className="text-sm text-muted-foreground mt-0.5 ltr text-left">{lessonData.title}</p>
            )}
          </div>
          {isCompleted && (
            <span className="text-xs px-3 py-1.5 rounded-full font-bold flex-shrink-0 flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> مكتمل
            </span>
          )}
          {lessonData.accessLevel === "paid" && (
            <span className="text-xs px-3 py-1.5 rounded-full font-bold flex-shrink-0" style={{ background: theme.primaryLight, color: theme.primary }}>مدفوع</span>
          )}
        </div>
      </div>

      {isAccessLocked ? (
        <div className="rounded-2xl aspect-video flex flex-col items-center justify-center gap-4 bg-card border border-card-border">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: theme.primaryLight }}>
            <Lock className="w-10 h-10" style={{ color: theme.primary }} />
          </div>
          <div className="text-center">
            <p className="text-foreground font-bold text-lg mb-1">محتوى مدفوع</p>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">هذا الدرس متاح للأعضاء المدفوعين فقط. تواصل مع المعلم للترقية.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-5">

            {hasVideo && (
              <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-tonal">
                <iframe
                  src={getYouTubeEmbedUrl(lessonData.youtubeUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={lessonData.titleAr}
                />
              </div>
            )}

            {hasImage && (
              <div className="rounded-2xl overflow-hidden bg-card border border-card-border">
                <img src={lessonData.imageUrl} alt={lessonData.titleAr} className="w-full h-auto object-cover max-h-96" />
              </div>
            )}

            {hasAudio && (
              <div className="rounded-2xl p-5 bg-card border border-card-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.primaryLight }}>
                    <Headphones className="w-5 h-5" style={{ color: theme.primary }} />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">استماع للدرس</h3>
                </div>
                <audio controls className="w-full" src={lessonData.audioUrl} style={{ accentColor: theme.primary }}>
                  متصفحك لا يدعم تشغيل الصوت
                </audio>
              </div>
            )}

            {hasPdf && (
              <div className="rounded-2xl bg-card border border-card-border overflow-hidden">
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.primaryLight }}>
                      <FileText className="w-5 h-5" style={{ color: theme.primary }} />
                    </div>
                    <h3 className="font-bold text-foreground text-sm">ملف PDF</h3>
                  </div>
                  <a
                    href={lessonData.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                    style={{ color: theme.primary, background: theme.primaryLight }}
                  >
                    <ExternalLink className="w-3 h-3" /> فتح في تبويب جديد
                  </a>
                </div>
                <iframe src={lessonData.pdfUrl} className="w-full" style={{ height: "600px", border: "none" }} title="PDF Viewer" />
              </div>
            )}

            {hasRichText && (
              <div className="rounded-2xl p-5 bg-card border border-card-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: theme.primaryLight }}>
                    <FileText className="w-5 h-5" style={{ color: theme.primary }} />
                  </div>
                  <h3 className="font-bold text-foreground text-sm">شرح الدرس</h3>
                </div>
                {lessonData.richTextAr && (
                  <div
                    className="prose prose-sm max-w-none text-foreground leading-relaxed tiptap-content"
                    dir="rtl"
                    dangerouslySetInnerHTML={{ __html: lessonData.richTextAr }}
                  />
                )}
                {lessonData.richText && (
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground leading-relaxed mt-4 ltr tiptap-content"
                    dir="ltr"
                    dangerouslySetInnerHTML={{ __html: lessonData.richText }}
                  />
                )}
              </div>
            )}

            {lessonData.descriptionAr && (
              <div className="p-5 rounded-2xl bg-card border border-card-border">
                <h3 className="font-bold text-foreground mb-2 text-base">وصف الدرس</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{lessonData.descriptionAr}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-4">

            {hasQuiz && (
              <div
                className="p-5 rounded-2xl border"
                style={{
                  background: quizPassed ? "#10B98108" : theme.primaryLight,
                  borderColor: quizPassed ? "#10B98130" : `${theme.primary}18`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-5 h-5" style={{ color: quizPassed ? "#10B981" : theme.primary }} />
                  <h4 className="font-bold text-foreground text-sm">اختبار الدرس</h4>
                </div>

                {bestQuizScore !== null && (
                  <div className="mb-3 p-3 rounded-xl bg-white/50 dark:bg-black/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">أفضل درجة</span>
                      <span className="text-sm font-bold" style={{ color: quizPassed ? "#10B981" : "#F59E0B" }}>
                        {bestQuizScore}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${bestQuizScore}%`, backgroundColor: quizPassed ? "#10B981" : "#F59E0B" }}
                      />
                    </div>
                    {!quizPassed && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> تحتاج 70% للاجتياز
                      </p>
                    )}
                  </div>
                )}

                {quizPassed ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-3">
                    <CheckCircle2 className="w-3.5 h-3.5" /> اجتزت الاختبار بنجاح!
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">
                    {bestQuizScore !== null
                      ? "أعد الاختبار للحصول على 70% أو أكثر لإكمال الدرس"
                      : "اختبر معلوماتك للمضي قدماً"}
                  </p>
                )}

                <button
                  onClick={() => setShowExamModal(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
                  style={{ background: theme.primary }}
                >
                  {quizPassed ? "مراجعة الاختبار" : bestQuizScore !== null ? "أعد الاختبار" : "ابدأ الاختبار"}
                </button>
              </div>
            )}

            {lessonData.unitId && (
              <div className="p-5 rounded-2xl bg-card border border-card-border">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5" style={{ color: theme.primary }} />
                  <h4 className="font-bold text-foreground text-sm">تقدمك</h4>
                </div>
                {isCompleted ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-bold text-center flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> تم إكمال الدرس
                  </div>
                ) : isProgressLocked ? (
                  <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 bg-muted text-muted-foreground">
                    <Lock className="w-4 h-4" /> أكمل الدرس السابق أولاً
                  </div>
                ) : !canComplete ? (
                  <div className="space-y-2">
                    <div className="w-full py-2.5 rounded-xl text-sm font-medium text-center flex items-center justify-center gap-2 bg-muted text-muted-foreground opacity-60 cursor-not-allowed">
                      <ClipboardList className="w-4 h-4" /> يتطلب اجتياز الاختبار أولاً
                    </div>
                    <p className="text-xs text-muted-foreground text-center">احصل على 70% في اختبار الدرس لإكماله</p>
                  </div>
                ) : (
                  <div>
                    <button
                      onClick={() => markComplete.mutate()}
                      disabled={markComplete.isPending}
                      className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                      style={{ background: theme.primary }}
                    >
                      {markComplete.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      إكمال الدرس
                    </button>
                    {markComplete.isError && (
                      <p className="text-xs text-destructive text-center mt-2 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {(markComplete.error as any)?.message || "حدث خطأ"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="p-5 rounded-2xl bg-card border border-card-border">
              <div className="flex items-center gap-3 mb-4">
                <img src={theme.logo} alt={theme.sidebarTitle} className="h-10 w-10 object-contain" />
                <div>
                  <p className="font-bold text-foreground text-sm">{theme.sidebarTitle}</p>
                  <p className="text-xs text-muted-foreground">{theme.sidebarSubtitle}</p>
                </div>
              </div>
              <div className="h-px w-full mb-4" style={{ background: "rgba(160,174,198,0.15)" }} />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المستوى</span>
                  <span className="font-bold px-3 py-1 rounded-full text-xs" style={{ background: theme.primaryLight, color: theme.primary }}>
                    {theme.labelAr}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">الوصول</span>
                  <span className="font-medium text-foreground">{lessonData.accessLevel === "paid" ? "مدفوع" : "مجاني"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">المحتوى</span>
                  <div className="flex items-center gap-1.5">
                    {hasVideo && <PlayCircle className="w-4 h-4" style={{ color: theme.primary }} />}
                    {hasAudio && <Headphones className="w-4 h-4" style={{ color: theme.primary }} />}
                    {hasRichText && <FileText className="w-4 h-4" style={{ color: theme.primary }} />}
                    {hasPdf && <FileText className="w-4 h-4" style={{ color: theme.primary }} />}
                    {hasImage && <ImageIcon className="w-4 h-4" style={{ color: theme.primary }} />}
                    {hasQuiz && <ClipboardList className="w-4 h-4" style={{ color: theme.primary }} />}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/lessons"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-white transition-all shadow-tonal-sm"
              style={{ border: "1px solid rgba(160,174,198,0.2)", background: "white" }}
            >
              <ChevronLeft className="w-4 h-4" /><span>جميع الدروس</span>
            </Link>
          </div>
        </div>
      )}

      {showExamModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowExamModal(false); }}
        >
          <div
            className="relative flex flex-col bg-card rounded-2xl shadow-2xl w-full max-w-3xl"
            style={{ maxHeight: "92vh", border: "1px solid rgba(160,174,198,0.2)" }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: "rgba(160,174,198,0.15)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: theme.primaryLight }}>
                  <ClipboardList className="w-4 h-4" style={{ color: theme.primary }} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground text-sm leading-tight">
                    {(examData as any)?.titleAr || "اختبار الدرس"}
                  </h2>
                  <p className="text-xs text-muted-foreground">أكمل النموذج ثم تحقق من نتيجتك</p>
                </div>
              </div>
              <button
                onClick={() => setShowExamModal(false)}
                className="p-2 rounded-xl hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
              {googleFormUrl ? (
                <iframe
                  src={googleFormUrl}
                  className="w-full h-full"
                  style={{ border: "none", minHeight: "520px" }}
                  title="اختبار الدرس"
                  allow="camera; microphone"
                />
              ) : (
                <div className="flex items-center justify-center h-full py-20 text-muted-foreground">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: theme.primary }} />
                    <p className="text-sm">جاري تحميل الاختبار...</p>
                  </div>
                </div>
              )}
            </div>

            <div
              className="px-5 py-4 border-t flex-shrink-0 space-y-3"
              style={{ borderColor: "rgba(160,174,198,0.15)" }}
            >
              {bestQuizScore !== null && (
                <div
                  className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
                  style={{
                    background: quizPassed ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                    border: `1px solid ${quizPassed ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}
                >
                  <span className="text-muted-foreground text-xs">آخر درجة مسجلة</span>
                  <span className="font-bold text-sm" style={{ color: quizPassed ? "#10B981" : "#F59E0B" }}>
                    {bestQuizScore}% {quizPassed ? "✓ اجتزت" : "— تحتاج 70%"}
                  </span>
                </div>
              )}

              <button
                onClick={handleVerifyScore}
                disabled={verifyLoading}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: theme.primary }}
              >
                {verifyLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحقق...</>
                  : <><RefreshCw className="w-4 h-4" /> أنهيت وأرسلت الاختبار؟ انتظر 5 ثوانٍ ثم تحقق من النتيجة ⏳</>}
              </button>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                بعد إرسال النموذج، انقر الزر أعلاه للتحقق من درجتك المسجلة
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}