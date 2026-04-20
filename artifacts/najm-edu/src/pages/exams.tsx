import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME } from "@/lib/utils";
import { useListExams, useListMyAttempts, getListExamsQueryKey, getListMyAttemptsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { FileText, Lock, ChevronLeft, Loader2, CheckCircle } from "lucide-react";

export default function Exams() {
  const { user, isPaid } = useAuth();
  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;

  const { data: exams, isLoading } = useListExams(
    { gradeLevel: grade },
    { query: { queryKey: getListExamsQueryKey({ gradeLevel: grade }), enabled: !!user } }
  );
  const { data: myAttempts } = useListMyAttempts({
    query: { queryKey: getListMyAttemptsQueryKey(), enabled: !!user }
  });

  const examList = Array.isArray(exams) ? exams : [];
  const attemptList = Array.isArray(myAttempts) ? myAttempts : [];

  const getBestAttempt = (examId: number) => {
    return attemptList.find((a: any) => a.examId === examId && a.isBestScore);
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1
          className="text-2xl font-extrabold text-foreground"
          style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
        >
          الاختبارات
        </h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          <img src={theme.logo} alt="" className="h-4 w-4 object-contain" />
          اختبارات {theme.labelAr}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-9 h-9 animate-spin" style={{ color: theme.primary }} />
        </div>
      ) : examList.length === 0 ? (
        <div className="text-center py-20">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: theme.primaryLight }}
          >
            <FileText className="w-8 h-8" style={{ color: theme.primary }} />
          </div>
          <p className="font-semibold text-foreground">لا توجد اختبارات متاحة بعد</p>
          <p className="text-sm text-muted-foreground mt-1">سيتم إضافة الاختبارات قريباً</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {examList.map((exam: any) => {
            const isLocked = exam.accessLevel === "paid" && !isPaid;
            const best = getBestAttempt(exam.id);
            return (
              <Link
                key={exam.id}
                href={isLocked ? "#" : `/exams/${exam.id}`}
                className={`bg-white rounded-2xl p-4 shadow-tonal-sm transition-all ${
                  isLocked ? "opacity-70 cursor-not-allowed" : "hover:translate-y-[-1px] hover:shadow-tonal cursor-pointer"
                }`}
                style={{ border: "1px solid rgba(160,174,198,0.15)" }}
                data-testid={`exam-${exam.id}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: theme.primaryLight }}
                  >
                    {isLocked ? (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <FileText className="w-5 h-5" style={{ color: theme.primary }} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">{exam.titleAr}</p>
                        {exam.title && (
                          <p className="text-sm text-muted-foreground mt-0.5 ltr text-left">{exam.title}</p>
                        )}
                      </div>
                      {best && (
                        <div className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0 font-semibold border border-green-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{best.score}/{best.maxScore}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-yellow-500 text-sm">⭐</span>
                        <span className="text-xs text-muted-foreground font-medium">{exam.starsReward} نجمة</span>
                      </div>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">أعلى درجة: {exam.maxScore}</span>
                      {exam.accessLevel === "paid" && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: isLocked ? "rgba(160,174,198,0.12)" : theme.primaryLight,
                            color: isLocked ? "hsl(var(--muted-foreground))" : theme.primary
                          }}
                        >
                          {isLocked ? "يتطلب ترقية" : "مدفوع"}
                        </span>
                      )}
                    </div>
                  </div>

                  {!isLocked && (
                    <ChevronLeft className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
