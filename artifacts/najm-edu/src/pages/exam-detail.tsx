import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getGoogleFormEmbedUrl } from "@/lib/utils";
import {
  useGetExam, useGetBestAttempt,
  getGetExamQueryKey, getGetBestAttemptQueryKey,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { Lock, Loader2, ChevronRight, Trophy } from "lucide-react";

interface Props { params: { id: string } }

export default function ExamDetail({ params }: Props) {
  const { isPaid, user } = useAuth();
  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;
  const examId = parseInt(params.id);

  const { data: exam, isLoading: examLoading } = useGetExam(examId, {
    query: { queryKey: getGetExamQueryKey(examId), enabled: !isNaN(examId) }
  });
  const { data: bestAttempt } = useGetBestAttempt(examId, {
    query: { queryKey: getGetBestAttemptQueryKey(examId), enabled: !isNaN(examId), retry: false }
  });

  if (examLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!exam) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">
          <p>الاختبار غير موجود</p>
          <Link href="/exams" className="text-primary text-sm mt-2 block">العودة للاختبارات</Link>
        </div>
      </Layout>
    );
  }

  const examData = exam as any;
  const bestData = bestAttempt as any;
  const isLocked = examData.accessLevel === "paid" && !isPaid;


  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/exams" className="hover:text-primary flex items-center gap-1">
          <ChevronRight className="w-4 h-4" /><span>الاختبارات</span>
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{examData.titleAr}</span>
      </div>

      <div className="max-w-3xl">
        {/* Header */}
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-foreground">{examData.titleAr}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{examData.title}</p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: theme.primaryLight }}>
              <span className="text-yellow-500 star-glow">⭐</span>
              <span className="text-sm font-bold" style={{ color: theme.primary }}>{examData.starsReward}</span>
            </div>
          </div>

          {bestData && (
            <div className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <Trophy className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-400">أفضل نتيجة سابقة</p>
                <p className="text-sm text-muted-foreground">{bestData.score} من {bestData.maxScore} • {bestData.starsEarned} نجمة</p>
              </div>
            </div>
          )}
        </div>

        {/* Google Form Embed */}
        {isLocked ? (
          <div className="rounded-2xl bg-card border border-card-border aspect-video flex flex-col items-center justify-center gap-3 mb-4">
            <Lock className="w-10 h-10 text-muted-foreground" />
            <p className="font-semibold text-foreground">محتوى مدفوع</p>
            <p className="text-sm text-muted-foreground text-center max-w-xs">تواصل مع المعلم لتفعيل حسابك المدفوع</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden border border-card-border mb-4 bg-white" style={{ height: "600px" }}>
            <iframe
              src={getGoogleFormEmbedUrl(examData.googleFormUrl)}
              className="w-full h-full"
              frameBorder="0"
              marginHeight={0}
              marginWidth={0}
              title={examData.title}
            >
              جاري التحميل...
            </iframe>
          </div>
        )}

        {/* Info: scores are recorded automatically via the exam form webhook */}
        {!isLocked && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>تُسجَّل نتائجك تلقائياً بعد إتمام الاختبار. أفضل درجة هي التي تُحتسب منها النجوم.</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
