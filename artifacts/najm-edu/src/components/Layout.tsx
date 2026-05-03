import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { GRADE_CONFIG, ADMIN_THEME } from "@/lib/utils";
import {
  Home, BookOpen, Trophy, Bell, User, LogOut, Menu, X,
  LayoutDashboard, Users, ClipboardList, Send, Layers, Settings, Shield, MessageSquare
} from "lucide-react";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";

const ONBOARDING_KEY = "has_seen_onboarding";
const INSTALL_HIDE_KEY = "hide_install_prompt";

const studentNav = [
  { path: "/", label: "الرئيسية", icon: Home },
  { path: "/lessons", label: "الدروس", icon: BookOpen },
  { path: "/leaderboard", label: "المتصدرون", icon: Trophy },
  { path: "/notifications", label: "الإشعارات", icon: Bell },
  { path: "/profile", label: "الملف الشخصي", icon: User },
];

const adminNav = [
  { path: "/admin", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/students", label: "الطلاب", icon: Users },
  { path: "/admin/subjects", label: "المواد (LMS v2)", icon: Layers },
  { path: "/admin/exams", label: "إدارة الاختبارات", icon: ClipboardList },
  { path: "/admin/submissions", label: "رسائل الطلاب", icon: MessageSquare },
  { path: "/admin/notifications", label: "الإشعارات", icon: Send },
  { path: "/admin/site-settings", label: "إعدادات الموقع", icon: Settings },
];

const teacherNav = [
  { path: "/teacher", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/students", label: "طلابي", icon: Users },
  { path: "/admin/subjects", label: "موادي", icon: Layers },
  { path: "/admin/exams", label: "الاختبارات", icon: ClipboardList },
  { path: "/admin/submissions", label: "رسائل الطلاب", icon: MessageSquare },
];

const staffManagementTab = { path: "/admin/staff-management", label: "إدارة الكادر الإداري", icon: Shield };

function OnboardingModal({ theme, onDone }: { theme: typeof ADMIN_THEME; onDone: () => void }) {
  const [, navigate] = useLocation();

  const handleGo = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    onDone();
    navigate("/profile");
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleGo} />
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white">
        <div
          className="px-6 pt-6 pb-4 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.gradientFrom ?? theme.primary}cc)` }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl flex-shrink-0">
            🌟
          </div>
          <h2
            className="text-xl font-bold text-white leading-snug"
            style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
          >
            خطوتان فقط للبدء!
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-foreground text-sm leading-relaxed" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            أهلاً بك! بقي فقط خطوتين صغيرتين لكي تكمل تجهيز حسابك بشكل نهائي:
          </p>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: theme.primaryLight }}>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: theme.primary }}
              >
                ١
              </span>
              <p className="text-sm font-medium text-foreground leading-relaxed" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                تغيير كلمة السر الخاصة بك
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: theme.primaryLight }}>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: theme.primary }}
              >
                ٢
              </span>
              <p className="text-sm font-medium text-foreground leading-relaxed" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                تفعيل الإشعارات لتصلك علاماتك وإعلانات الدروس
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleGo}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base text-white transition-all hover:opacity-90 active:scale-[0.98] shadow-md"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.gradientFrom ?? theme.primary}cc)`,
              fontFamily: "'IBM Plex Sans Arabic', sans-serif",
            }}
          >
            <span className="whitespace-nowrap">الانتقال لملفي الشخصي</span>
            <span>👤</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type BannerMode = "install" | "ios" | null;

function InstallBanner() {
  const deferredPrompt = useRef<any>(null);
  const [mode, setMode] = useState<BannerMode>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forceDebug = params.get("force_pwa") === "1";

    const isStandalone = !forceDebug && window.matchMedia("(display-mode: standalone)").matches;
    const hidden = !forceDebug && sessionStorage.getItem(INSTALL_HIDE_KEY);
    if (isStandalone || hidden) return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS && !forceDebug) {
      setMode("ios");
      return;
    }

    const activate = () => {
      const stored = (window as any).deferredPrompt;
      if (stored) {
        deferredPrompt.current = stored;
        setMode("install");
      } else if (forceDebug) {
        setMode("install");
      }
    };

    if ((window as any).deferredPrompt || forceDebug) {
      activate();
    } else {
      window.addEventListener("pwa-prompt-ready", activate);
      return () => window.removeEventListener("pwa-prompt-ready", activate);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
    setMode(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(INSTALL_HIDE_KEY, "true");
    setMode(null);
  };

  if (!mode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3" dir="rtl">
      <div
        className="max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1d2b49, #2d4070)" }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="text-2xl flex-shrink-0">{mode === "ios" ? "🍏" : "🚀"}</div>
          <p
            className="flex-1 text-white text-sm font-medium leading-snug"
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          >
            {mode === "ios"
              ? "مستخدمي آيفون 🍏: لتثبيت التطبيق، اضغط على زر المشاركة بالأسفل ثم اختر 'إضافة للشاشة الرئيسية' 📱."
              : "تجربة أفضل وأسرع! قم بتثبيت تطبيق نجم التعليمي على هاتفك."}
          </p>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          {mode === "install" && (
            <button
              onClick={handleInstall}
              className="flex-1 py-2.5 rounded-xl bg-white text-sm font-bold transition-all hover:bg-white/90 active:scale-[0.98]"
              style={{ color: "#1d2b49", fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              تثبيت التطبيق 📥
            </button>
          )}
          <button
            onClick={handleDismiss}
            className={`py-2.5 rounded-xl text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all border border-white/20 ${mode === "ios" ? "flex-1" : "flex-1"}`}
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          >
            ذكرني لاحقاً ⏱️
          </button>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: userLogout, isAdmin } = useAuth();
  const { staff, logout: staffLogout, isSuperAdmin, isTeacher, isSupervisor } = useStaffAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: notifications } = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), retry: false, enabled: !!user } });

  const unreadCount = Array.isArray(notifications) ? notifications.filter((n: any) => !n.isRead).length : 0;

  const isAnyStaff = !!staff;
  const isAdminView = isAdmin || isAnyStaff;

  const theme = isAdminView
    ? ADMIN_THEME
    : user?.gradeLevel
    ? (GRADE_CONFIG[user.gradeLevel] ?? ADMIN_THEME)
    : ADMIN_THEME;

  const nav = isTeacher
    ? teacherNav
    : isAdminView
    ? isSuperAdmin
      ? [...adminNav, staffManagementTab]
      : adminNav
    : studentNav;

  const displayName = staff?.fullName || user?.fullName || "";
  const displayRole = isSuperAdmin
    ? `مدير عام · ${staff?.adminId}`
    : isSupervisor
    ? `مشرف · ${staff?.adminId}`
    : isTeacher
    ? `معلم · ${staff?.adminId}`
    : isAdmin
    ? "المدير"
    : "الطالب";

  useEffect(() => {
    const el = document.documentElement;
    if (isAdminView) {
      el.removeAttribute("data-grade");
    } else if (user?.gradeLevel) {
      el.setAttribute("data-grade", user.gradeLevel);
    }
    return () => el.removeAttribute("data-grade");
  }, [user?.gradeLevel, isAdminView]);

  useEffect(() => {
    if (user && !isAdminView) {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShowOnboarding(true);
      }
    }
  }, [user, isAdminView]);

  const handleLogout = () => {
    staffLogout();
    userLogout();
  };

  const SidebarContent = () => (
    <>
      <div className="px-5 pt-6 pb-5 flex items-center gap-3">
        <img
          src={theme.logo}
          alt={theme.sidebarTitle}
          className="h-12 w-12 object-contain flex-shrink-0"
        />
        <div>
          <h2
            className="font-bold text-base leading-tight"
            style={{ color: theme.primary, fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
          >
            {theme.sidebarTitle}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">{theme.sidebarSubtitle}</p>
        </div>
      </div>

      <div className="mx-3 mb-4 h-px" style={{ background: `${theme.primary}18` }} />

      <nav className="flex-1 px-3 space-y-0.5">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = location === item.path || (item.path !== "/" && item.path !== "/teacher" && location.startsWith(item.path)) || (item.path === "/teacher" && location === "/teacher");
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                active
                  ? "text-white shadow-tonal-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
              style={active ? { backgroundColor: theme.primary } : {}}
              data-testid={`nav-${item.path.replace(/\//g, "-")}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span
                  className="mr-auto text-xs rounded-full w-5 h-5 flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: "#EF4444" }}
                >
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 mt-2">
        {(user || staff) && (
          <div
            className="mb-3 px-4 py-3 rounded-xl"
            style={{ background: theme.primaryLight }}
          >
            <p className="text-xs text-muted-foreground font-medium">{displayRole}</p>
            <p className="text-sm font-bold text-foreground truncate mt-0.5">{displayName}</p>
            {!isAdminView && user && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-yellow-500 star-glow text-sm">⭐</span>
                <span className="text-xs font-bold" style={{ color: theme.primary }}>
                  {user.starsBalance} نجمة
                </span>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all w-full text-sm font-medium"
          data-testid="btn-logout"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: theme.surface }}>
      {showOnboarding && (
        <OnboardingModal theme={theme} onDone={() => setShowOnboarding(false)} />
      )}

      <InstallBanner />

      {/* Desktop Sidebar — Fixed right */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar fixed right-0 top-0 h-full z-30 shadow-tonal">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-nav shadow-sm flex items-center justify-between px-4 h-14">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl hover:bg-sidebar-accent transition-all"
          data-testid="btn-mobile-menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <div className="flex items-center gap-2">
          <img src={theme.logo} alt="logo" className="h-7 w-7 object-contain" />
          <span
            className="text-sm font-bold"
            style={{ color: theme.primary, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {theme.sidebarTitle}
          </span>
        </div>

        {user && !isAdminView && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ background: theme.primaryLight, color: theme.primary }}>
            <span className="star-glow">⭐</span>
            <span>{user.starsBalance}</span>
          </div>
        )}
        {isAdminView && <div className="w-16" />}
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-sidebar h-full z-10 overflow-y-auto shadow-tonal mr-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-2">
                <img src={theme.logo} alt="logo" className="h-8 w-8 object-contain" />
                <span className="text-sm font-bold" style={{ color: theme.primary }}>
                  {theme.sidebarTitle}
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-all"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 lg:mr-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-5 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
