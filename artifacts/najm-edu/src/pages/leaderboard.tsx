import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME } from "@/lib/utils";
import { useGetLeaderboard, useGetMyRank, getGetLeaderboardQueryKey, getGetMyRankQueryKey } from "@workspace/api-client-react";
import { Star, Trophy, Medal, Loader2 } from "lucide-react";

const GRADE_FILTERS = [
  { key: "grade9",      label: "الصف التاسع" },
  { key: "grade12_sci", label: "بكالوريا علمي" },
  { key: "grade12_lit", label: "بكالوريا أدبي" },
  { key: "english",     label: "الإنجليزية" },
  { key: "steps1000",   label: "1000 خطوة" },
  { key: "ielts",       label: "IELTS" },
];

export default function Leaderboard() {
  const { user, isAdmin } = useAuth();
  const [gradeFilter, setGradeFilter] = useState(() => user?.gradeLevel || "grade9");

  const params = gradeFilter ? { gradeLevel: gradeFilter } : {};
  const { data: leaderboard, isLoading } = useGetLeaderboard(
    params,
    { query: { queryKey: getGetLeaderboardQueryKey(params), enabled: !!user } }
  );
  const { data: myRank } = useGetMyRank({ query: { queryKey: getGetMyRankQueryKey(), enabled: !!user } });

  const entries = (leaderboard as any)?.entries || [];
  const total = (leaderboard as any)?.total || 0;
  const rankData = myRank as any;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400 fill-current" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-slate-300 fill-current" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600 fill-current" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
  };

  const getRowStyle = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return "border-primary/60 bg-primary/10";
    if (rank === 1) return "border-yellow-400/30 bg-yellow-400/5";
    if (rank === 2) return "border-slate-400/30 bg-slate-400/5";
    if (rank === 3) return "border-amber-600/30 bg-amber-600/5";
    return "border-card-border hover:border-primary/30";
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">لوحة المتصدرين</h1>
        <p className="text-sm text-muted-foreground mt-0.5">ترتيب الطلاب حسب النجوم المكتسبة</p>
      </div>

      {/* My Rank Banner */}
      {rankData && (
        <div className="bg-primary/10 border border-primary/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">ترتيبك الحالي</p>
              <p className="text-2xl font-bold text-foreground mt-0.5">
                <span className="text-primary">{rankData.rank}</span>
                <span className="text-base text-muted-foreground"> من {rankData.total}</span>
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-current text-primary" />
                <span className="text-xl font-bold text-primary">{rankData.starsBalance}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">نجمة</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{rankData.percentile}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">أفضل من</p>
            </div>
          </div>
        </div>
      )}

      {/* Grade Filter — admin can switch tracks, students are locked to their own */}
      {isAdmin ? (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {GRADE_FILTERS.map((f) => {
            const cfg = GRADE_CONFIG[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setGradeFilter(f.key)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                style={gradeFilter === f.key
                  ? { backgroundColor: cfg?.primary || "hsl(var(--primary))", color: "#fff" }
                  : { backgroundColor: "hsl(var(--card))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
                }
                data-testid={`filter-${f.key}`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-4">
          {(() => {
            const cfg = GRADE_CONFIG[gradeFilter] ?? ADMIN_THEME;
            return (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: cfg.primaryLight, color: cfg.primary }}
              >
                {cfg.labelAr}
              </span>
            );
          })()}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد بيانات بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry: any) => {
            const entryGradeConfig = GRADE_CONFIG[entry.gradeLevel];
            return (
              <div
                key={entry.studentId}
                className={`flex items-center gap-3 bg-card border rounded-xl p-3 transition-all ${getRowStyle(entry.rank, entry.isCurrentUser)}`}
                data-testid={`leaderboard-entry-${entry.rank}`}
              >
                <div className="w-8 flex items-center justify-center flex-shrink-0">
                  {getRankIcon(entry.rank)}
                </div>

                <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: entryGradeConfig?.primaryLight || "rgba(160,174,198,0.12)", color: entryGradeConfig?.primary || "#0057bd" }}
                >
                  {entry.fullName.charAt(0)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{entry.fullName}</p>
                    {entry.isCurrentUser && (
                      <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">أنت</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{entryGradeConfig?.labelAr || entry.gradeLevel}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Star className="w-4 h-4 fill-current text-primary" />
                  <span className="text-sm font-bold text-primary">{entry.starsBalance}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">{total} طالب مسجل</p>
      )}
    </Layout>
  );
}
