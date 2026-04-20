import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { GRADE_CONFIG, ADMIN_THEME } from "@/lib/utils";
import {
  Home, BookOpen, Trophy, Bell, User, LogOut, Menu, X,
  LayoutDashboard, Users, ClipboardList, Send, Layers, Settings, Shield
} from "lucide-react";
import { useListNotifications, getListNotificationsQueryKey } from "@workspace/api-client-react";

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
  { path: "/admin/notifications", label: "الإشعارات", icon: Send },
  { path: "/admin/site-settings", label: "إعدادات الموقع", icon: Settings },
];

const teacherNav = [
  { path: "/teacher", label: "لوحة التحكم", icon: LayoutDashboard },
  { path: "/admin/students", label: "طلابي", icon: Users },
  { path: "/admin/subjects", label: "موادي", icon: Layers },
  { path: "/admin/exams", label: "الاختبارات", icon: ClipboardList },
];

const staffManagementTab = { path: "/admin/staff-management", label: "إدارة الكادر الإداري", icon: Shield };

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout: userLogout, isAdmin } = useAuth();
  const { staff, logout: staffLogout, isSuperAdmin, isTeacher, isSupervisor } = useStaffAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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
      {/* Desktop Sidebar — Fixed right */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar fixed right-0 top-0 h-full z-30 shadow-tonal">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-nav shadow-sm flex items-center justify-between px-4 h-14"
      >
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
