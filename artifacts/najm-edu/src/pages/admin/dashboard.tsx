import { Layout } from "@/components/Layout";
import { useGetDashboardStats, useGetGradeSummary, getGetDashboardStatsQueryKey, getGetGradeSummaryQueryKey } from "@workspace/api-client-react";
import { GRADE_CONFIG } from "@/lib/utils";
import { Users, BookOpen, FileText, BarChart3, UserCheck, UserX, Loader2 } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({
    query: { queryKey: getGetDashboardStatsQueryKey() }
  });
  const { data: gradeSummary } = useGetGradeSummary({
    query: { queryKey: getGetGradeSummaryQueryKey() }
  });

  const statsData = stats as any;
  const summaryList = Array.isArray(gradeSummary) ? gradeSummary : [];

  const statCards = statsData ? [
    { label: "إجمالي الطلاب", value: statsData.totalStudents, icon: Users, color: "#F59E0B" },
    { label: "أعضاء مدفوعون", value: statsData.paidStudents, icon: UserCheck, color: "#10B981" },
    { label: "أعضاء مجانيون", value: statsData.freeStudents, icon: UserX, color: "#6B7280" },
    { label: "إجمالي الدروس", value: statsData.totalLessons, icon: BookOpen, color: "#3B82F6" },
    { label: "إجمالي الاختبارات", value: statsData.totalExams, icon: FileText, color: "#8B5CF6" },
    { label: "تسجيلات هذا الأسبوع", value: statsData.recentRegistrations, icon: BarChart3, color: "#EF4444" },
  ] : [];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-sm text-muted-foreground mt-0.5">نظرة عامة على المنصة</p>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-card border border-card-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${card.color}20` }}>
                      <Icon className="w-4 h-4" style={{ color: card.color }} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                </div>
              );
            })}
          </div>

          {/* Grade Summary */}
          {summaryList.length > 0 && (
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h2 className="font-bold text-foreground mb-4">توزيع الطلاب حسب المرحلة</h2>
              <div className="space-y-3">
                {summaryList.map((item: any) => {
                  const cfg = GRADE_CONFIG[item.gradeLevel];
                  const pct = item.count > 0 ? Math.round((item.paidCount / item.count) * 100) : 0;
                  return (
                    <div key={item.gradeLevel}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">{cfg?.labelAr || item.gradeLevel}</span>
                        <span className="text-sm text-muted-foreground">{item.count} طالب • {item.paidCount} مدفوع ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: cfg?.primary || "#F59E0B" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
