import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getApiBaseUrl } from "@/lib/utils";
import { useGetLeaderboard, useGetMyRank, getGetLeaderboardQueryKey, getGetMyRankQueryKey, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Star, Trophy, Medal, Loader2, Rocket, X } from "lucide-react";

const GRADE_FILTERS = [
  { key: "grade9",      label: "الصف التاسع" },
  { key: "grade12_sci", label: "بكالوريا علمي" },
  { key: "grade12_lit", label: "بكالوريا أدبي" },
  { key: "english",     label: "الإنجليزية" },
  { key: "steps1000",   label: "1000 خطوة" },
  { key: "ielts",       label: "IELTS" },
];

const API = getApiBaseUrl();

export default function Leaderboard() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [gradeFilter, setGradeFilter] = useState(() => user?.gradeLevel || "grade9");
  const [showBonus, setShowBonus] = useState(false);
  const [bonusClaiming, setBonusClaiming] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);

  // Show bonus popup only when DB says they haven't claimed it yet
  useEffect(() => {
    if (user && !isAdmin && user.receivedLeaderboardBonus === false) {
      const timer = setTimeout(() => setShowBonus(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user?.receivedLeaderboardBonus, isAdmin]);

  const params = gradeFilter ? { gradeLevel: gradeFilter } : {};
  const { data: leaderboard, isLoading } = useGetLeaderboard(
    params,
    { query: { queryKey: getGetLeaderboardQueryKey(params), enabled: !!user } }
  );
  const { data: myRank } = useGetMyRank({ query: { queryKey: getGetMyRankQueryKey(), enabled: !!user } });

  const entries = (leaderboard as any)?.entries || [];
  const total = (leaderboard as any)?.total || 0;
  const rankData = myRank as any;

  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;

  const handleClaimBonus = async () => {
    if (!user) return;
    setBonusClaiming(true);
    try {
      const token = localStorage.getItem("najm_token") || "";
      const res = await fetch(`${API}/users/me/leaderboard-bonus`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBonusClaimed(true);
        // Refresh user data so receivedLeaderboardBonus becomes true
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMyRankQueryKey() });
        qc.invalidateQueries({ queryKey: getGetLeaderboardQueryKey(params) });
        setTimeout(() => setShowBonus(false), 1800);
      }
    } catch {
      // silent fail
    } finally {
      setBonusClaiming(false);
    }
  };

  // "Remind me later" — just close the modal, DB flag stays false so it reappears next visit
  const handleRemindLater = () => setShowBonus(false);

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
      {/* First-visit Bonus Modal */}
      {showBonus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            {/* Header */}
            <div
              className="px-6 pt-6 pb-5 relative"
              style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.gradientFrom ?? theme.primary}99)` }}
            >
              <button
                onClick={handleRemindLater}
                className="absolute top-4 left-4 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white leading-snug">
                  مرحباً بك في لوحة المتصدرين!
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 text-center" dir="rtl">
              <p className="text-foreground font-semibold text-base leading-relaxed mb-1">
                شارك المنصة مع أصدقائك
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                واحصل على <span className="font-bold text-primary">50 نجمة انطلاقة فورية! 🚀</span>
              </p>

              {bonusClaimed ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <div className="text-3xl">🎉</div>
                  <p className="text-green-500 font-bold text-sm">تم إضافة 50 نجمة لرصيدك!</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleClaimBonus}
                    disabled={bonusClaiming}
                    className="w-full py-3.5 rounded-xl font-bold text-base transition-all hover:opacity-90 active:scale-[0.98] shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.gradientFrom ?? theme.primary}cc)`,
                      color: "#000000",
                    }}
                  >
                    {bonusClaiming
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <>
                          <Star className="w-5 h-5 fill-current" />
                          <span>احصل على 50 نجمة</span>
                        </>
                    }
                  </button>
                  <button
                    onClick={handleRemindLater}
                    className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-muted/50"
                    style={{ borderColor: theme.primary, color: theme.primary }}
                  >
                    ذكرني لاحقاً
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Grade Filter */}
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
