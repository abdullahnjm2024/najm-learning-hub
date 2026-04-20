import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StaffAuthProvider, useStaffAuth } from "@/contexts/StaffAuthContext";
import { Loader2, Star } from "lucide-react";

import Login from "@/pages/login";
import Home from "@/pages/home";
import Lessons from "@/pages/lessons";
import LessonDetail from "@/pages/lesson-detail";
import Exams from "@/pages/exams";
import ExamDetail from "@/pages/exam-detail";
import Leaderboard from "@/pages/leaderboard";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminExams from "@/pages/admin/exams";
import AdminNotifications from "@/pages/admin/notifications";
import AdminSubjects from "@/pages/admin/subjects";
import AdminSiteSettings from "@/pages/admin/site-settings";
import StaffManagement from "@/pages/super-admin/staff-management";
import TeacherDashboard from "@/pages/teacher/dashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Star className="w-8 h-8 text-primary fill-current" />
        </div>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

function AdminOrTeacherDashboard() {
  const { isTeacher } = useStaffAuth();
  return isTeacher ? <TeacherDashboard /> : <AdminDashboard />;
}

function RootRoute() {
  const { user, isLoading: userLoading } = useAuth();
  const { staff, isLoading: staffLoading, isTeacher } = useStaffAuth();
  if (userLoading || staffLoading) return <LoadingScreen />;
  if (!user && !staff) return <Login />;
  if (staff && !user) return <Redirect to={isTeacher ? "/teacher" : "/admin"} />;
  return <Home />;
}

function ProtectedRoute({ component: Component, adminOnly = false, allowTeacher = false, superAdminStaffOnly = false, teacherOnly = false, ...props }: {
  component: React.ComponentType<any>;
  adminOnly?: boolean;
  allowTeacher?: boolean;
  superAdminStaffOnly?: boolean;
  teacherOnly?: boolean;
  [key: string]: any;
}) {
  const { user, isLoading: userLoading, isAdmin } = useAuth();
  const { staff, isLoading: staffLoading, isSuperAdmin, isTeacher, isSupervisor } = useStaffAuth();
  const [, navigate] = useLocation();

  const isAnyStaff = !!staff;

  const redirectTo: string | null = (() => {
    if (userLoading || staffLoading) return null;
    if (!user && !staff) return "/login";
    if (superAdminStaffOnly && !isSuperAdmin) return "/";
    if (teacherOnly && !isTeacher) return "/";
    if (adminOnly && !isAdmin && !isSuperAdmin && !isSupervisor && !(allowTeacher && isTeacher)) return "/";
    if (!adminOnly && !teacherOnly && !user && isAnyStaff) {
      return isTeacher ? "/teacher" : "/admin";
    }
    return null;
  })();

  useEffect(() => {
    if (redirectTo) navigate(redirectTo);
  }, [redirectTo, navigate]);

  if (userLoading || staffLoading) return <LoadingScreen />;
  if (redirectTo) return <LoadingScreen />;

  return <Component {...props} />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading: userLoading } = useAuth();
  const { staff, isLoading: staffLoading, isTeacher } = useStaffAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (userLoading || staffLoading) return;
    if (user) navigate("/");
    else if (staff) navigate(isTeacher ? "/teacher" : "/admin");
  }, [user, staff, isTeacher, userLoading, staffLoading, navigate]);

  if (userLoading || staffLoading) return <LoadingScreen />;
  if (user || staff) return <LoadingScreen />;
  return <Component />;
}

function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="text-6xl font-extrabold text-primary/30">404</div>
      <h1 className="text-xl font-bold text-foreground">الصفحة غير موجودة</h1>
      <p className="text-sm text-muted-foreground">لا توجد صفحة بهذا العنوان</p>
      <button
        onClick={() => navigate("/")}
        className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:opacity-90 transition-all"
      >
        العودة للرئيسية
      </button>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public / landing page */}
      <Route path="/">
        <RootRoute />
      </Route>

      {/* Login page */}
      <Route path="/login">
        <GuestRoute component={Login} />
      </Route>

      {/* Student routes */}
      <Route path="/lessons">
        <ProtectedRoute component={Lessons} />
      </Route>
      <Route path="/lessons/:id">
        {(params) => <ProtectedRoute component={LessonDetail} params={params} />}
      </Route>
      <Route path="/exams">
        <ProtectedRoute component={Exams} />
      </Route>
      <Route path="/exams/:id">
        {(params) => <ProtectedRoute component={ExamDetail} params={params} />}
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute component={Leaderboard} />
      </Route>
      <Route path="/notifications">
        <ProtectedRoute component={Notifications} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>

      {/* Teacher-only dashboard route */}
      <Route path="/teacher">
        <ProtectedRoute component={TeacherDashboard} teacherOnly />
      </Route>

      {/* Admin routes — accessible to admin users, supervisor and super_admin staff */}
      {/* Routes with allowTeacher also allow teacher role */}
      <Route path="/admin">
        <ProtectedRoute component={AdminOrTeacherDashboard} adminOnly allowTeacher />
      </Route>
      <Route path="/admin/students">
        <ProtectedRoute component={AdminStudents} adminOnly allowTeacher />
      </Route>
      <Route path="/admin/exams">
        <ProtectedRoute component={AdminExams} adminOnly allowTeacher />
      </Route>
      <Route path="/admin/subjects">
        <ProtectedRoute component={AdminSubjects} adminOnly allowTeacher />
      </Route>
      <Route path="/admin/notifications">
        <ProtectedRoute component={AdminNotifications} adminOnly />
      </Route>
      <Route path="/admin/site-settings">
        <ProtectedRoute component={AdminSiteSettings} adminOnly />
      </Route>

      {/* Super admin staff management — only for super_admin staff role */}
      <Route path="/admin/staff-management">
        <ProtectedRoute component={StaffManagement} adminOnly superAdminStaffOnly />
      </Route>

      {/* Legacy redirect */}
      <Route path="/admin-dashboard">
        <Redirect to="/admin" />
      </Route>

      {/* Catch-all 404 */}
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StaffAuthProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
          </AuthProvider>
        </StaffAuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
