import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getApiBaseUrl } from "@/lib/utils";
import { useGetMyRank, useListNotifications, getGetMyRankQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { BookOpen, Trophy, Bell, Lock, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const tok = () => localStorage.getItem("najm_token") || "";

export default function Home() {
  const { user, isPaid, isAdmin } = useAuth();
  const grade = user?.gradeLevel || "grade9";
  const theme = isAdmin ? ADMIN_THEME : (GRADE_CONFIG[grade] ?? ADMIN_THEME);
  const [whatsappPhone, setWhatsappPhone] = useState("967738380741");

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/site-settings`)
      .then(r => r.json())
      .then((d: Record<string, string>) => { if (d.whatsapp_phone) setWhatsappPhone(d.whatsapp_phone); })
      .catch(() => {});
  }, []);

  const BASE = getApiBaseUrl();
  const { data: subjects = [] } = useQuery<any[]>({
    queryKey: ["subjects-count", grade],
    queryFn: () => fetch(`${BASE}/subjects?gradeLevel=${grade}`, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => r.json()),
    enabled: !!user,
  });

  const { data: rankData } = useGetMyRank({ query: { queryKey: getGetMyRankQueryKey(), enabled: !!user } });
  const { data: notifications } = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), enabled: !!user, retry: false } });

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;
  const subjectList = Array.isArray(subjects) ? subjects : [];

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "صباح الخير";
    if (hour < 17) return "مساء الخير";
    return "مساء النور";
  };

  return (
    <Layout>
      {/* Welcome Hero */}
      <div
        className="rounded-2xl p-6 mb-6 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, rgba(244,246,255,0.8) 100%)` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: theme.primary }}>
              {greeting()} 👋
            </p>
            <h2
              className="text-2xl font-extrabold text-foreground"
              style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
            >
              {user?.fullName}
            </h2>
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: theme.primaryLight, color: theme.primary }}
            >
              <img src={theme.logo} alt="" className="h-4 w-4 object-contain" />
              <span>{theme.labelAr}</span>
            </div>
          </div>

          <div
            className="flex flex-col items-center gap-1 px-5 py-3 rounded-2xl bg-white shadow-tonal-sm"
            style={{ border: `1px solid ${theme.primary}20` }}
          >
            <span className="text-2xl star-glow">⭐</span>
            <span className="text-2xl font-black" style={{ color: theme.primary }}>
              {user?.starsBalance || 0}
            </span>
            <span className="text-xs text-muted-foreground font-medium">نجمة</span>
          </div>
        </div>

        {!isPaid && (
          <div className="mt-4 flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2.5">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">حسابك مجاني — تواصل مع المعلم للترقية</span>
          </div>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "المواد", value: subjectList.length, icon: BookOpen, color: theme.primary, light: theme.primaryLight, link: "/lessons" },
          { label: "ترتيبك", value: rankData ? `${(rankData as any).rank}/${(rankData as any).total}` : "—", icon: Trophy, color: "#F59E0B", light: "rgba(245,159,11,0.1)", link: "/leaderboard" },
          { label: "الإشعارات", value: unreadCount, icon: Bell, color: "#EF4444", light: "rgba(239,68,68,0.1)", link: "/notifications" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.label}
              href={stat.link}
              className="bg-white rounded-2xl p-4 shadow-tonal-sm hover:translate-y-[-2px] transition-all group"
              style={{ border: "1px solid rgba(160,174,198,0.15)" }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: stat.light }}
              >
                <Icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <p className="text-xl font-black text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* WhatsApp Support */}
      {!isAdmin && (
        <a
          href={`https://wa.me/${whatsappPhone}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-4 rounded-2xl hover-lift cursor-pointer mt-2"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)", border: "none" }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold text-white text-sm">لديك استفسار؟</p>
            <p className="text-white/80 text-xs mt-0.5">تواصل مع الدعم الفني عبر واتساب</p>
          </div>
          <div className="text-white/60 text-xs font-medium">اضغط للتواصل ←</div>
        </a>
      )}
    </Layout>
  );
}
