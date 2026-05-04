import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useGetDashboardStats, useGetGradeSummary, getGetDashboardStatsQueryKey, getGetGradeSummaryQueryKey } from "@workspace/api-client-react";
import { GRADE_CONFIG, getApiBaseUrl } from "@/lib/utils";
import { Users, BookOpen, FileText, BarChart3, UserCheck, UserX, Loader2, Download } from "lucide-react";

const API = getApiBaseUrl();
const tok = () => localStorage.getItem("najm_token") || "";

export default function AdminDashboard() {
  const [excelLoading, setExcelLoading] = useState(false);

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

  const handleExportExcel = async () => {
    setExcelLoading(true);
    try {
      const res = await fetch(`${API}/admin/report/students`, {
        headers: { Authorization: `Bearer ${tok()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `تقرير_الطلاب_${date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Excel Export Error]", err);
      alert("تعذّر تحميل التقرير، حاول مجدداً");
    } finally {
      setExcelLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground mt-1">نظرة عامة على نظام نجم التعليمي</p>
        </div>
        <button
          onClick={handleExportExcel}
          disabled={excelLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{ background: "#10B981" }}
        >
          {excelLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>استخراج تقرير الطلاب (Excel)</span>
        </button>
      </div>

      {statsLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
            {statCards.map((card) => (
              <div key={card.label} className="bg-card border border-card-border rounded-2xl p-5 flex flex-col items-center gap-2">
                <card.icon className="w-6 h-6" style={{ color: card.color }} />
                <p className="text-2xl font-extrabold text-foreground">{card.value ?? "—"}</p>
                <p className="text-xs text-muted-foreground text-center">{card.label}</p>
              </div>
            ))}
          </div>

          {summaryList.length > 0 && (
            <div className="bg-card border border-card-border rounded-2xl p-5">
              <h2 className="font-bold text-foreground mb-4">توزيع الطلاب حسب المرحلة</h2>
              <div className="space-y-3">
                {summaryList.map((row: any) => {
                  const cfg = Object.values(GRADE_CONFIG).find((c: any) => c.gradeLevel === row.gradeLevel) as any;
                  return (
                    <div key={row.gradeLevel} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="text-sm text-foreground">{cfg?.labelAr ?? row.gradeLevel}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-green-400">{row.paidCount ?? 0} مدفوع</span>
                        <span className="text-xs text-muted-foreground">{row.freeCount ?? 0} مجاني</span>
                        <span className="text-sm font-bold text-foreground">{row.total ?? 0}</span>
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
