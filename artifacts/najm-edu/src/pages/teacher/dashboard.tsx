import { useState, useEffect } from "react";
import { useStaffAuth, fetchWithStaffAuth } from "@/contexts/StaffAuthContext";
import { Layout } from "@/components/Layout";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap, ClipboardList,
  Loader2, ChevronLeft
} from "lucide-react";

const TRACK_LABELS: Record<string, string> = {
  grade9:      "الصف التاسع",
  grade12_sci: "بكالوريا علمي",
  grade12_lit: "بكالوريا أدبي",
  english:     "كورسات إنجليزي",
  steps1000:   "مشروع ألف خطوة",
  ielts:       "تحضير آيلتس",
};

interface Subject {
  id: number;
  titleAr: string;
  gradeLevel: string;
}

export default function TeacherDashboard() {
  const { staff } = useStaffAuth();
  const [, navigate] = useLocation();
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, subjectsRes] = await Promise.all([
          fetchWithStaffAuth("/users?limit=1"),
          fetchWithStaffAuth("/subjects"),
        ]);
        if (usersRes.ok) {
          const data = await usersRes.json();
          setStudentCount(data.total);
        }
        if (subjectsRes.ok) {
          setSubjects(await subjectsRes.json());
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const assignedTracks = staff?.assignedTracks ?? [];

  const stats = [
    { label: "عدد الطلاب", value: studentCount, icon: Users, color: "#0057bd" },
    { label: "المواد المُسندة", value: subjects.length, icon: BookOpen, color: "#7C3AED" },
    { label: "المسارات المُسندة", value: assignedTracks.length, icon: GraduationCap, color: "#059669" },
  ];

  const quickLinks = [
    { label: "طلابي", path: "/admin/students", icon: Users, color: "#0057bd" },
    { label: "موادي", path: "/admin/subjects", icon: BookOpen, color: "#7C3AED" },
    { label: "الاختبارات", path: "/admin/exams", icon: ClipboardList, color: "#D97706" },
  ];

  return (
    <Layout>
      <div dir="rtl" style={{ fontFamily: "'Manrope', 'IBM Plex Sans Arabic', sans-serif" }}>
        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,87,189,0.1)" }}>
              <LayoutDashboard className="w-5 h-5" style={{ color: "#0057bd" }} />
            </div>
            <div>
              <h1
                className="text-xl font-black text-foreground"
                style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
              >
                مرحباً، {staff?.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">{staff?.adminId} · معلم</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="p-5 rounded-2xl bg-white"
              style={{ border: "1px solid rgba(160,174,198,0.15)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-black" style={{ color }}>
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color }} />
                  ) : (
                    value ?? "—"
                  )}
                </span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {quickLinks.map(({ label, path, icon: Icon, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center justify-between p-4 rounded-2xl bg-white hover:shadow-md transition-all group"
              style={{ border: "1px solid rgba(160,174,198,0.15)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="text-sm font-bold text-foreground">{label}</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Assigned Tracks */}
          <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
            <h2 className="font-bold text-foreground mb-4 text-sm">المسارات المُسندة إليك</h2>
            {assignedTracks.length === 0 ? (
              <p className="text-xs text-muted-foreground">لم يتم إسناد أي مسارات بعد. يرجى التواصل مع المدير.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {assignedTracks.map(track => (
                  <span
                    key={track}
                    className="px-3 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: "#EBF1FF", color: "#0057bd" }}
                  >
                    {TRACK_LABELS[track] || track}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Subjects */}
          <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
            <h2 className="font-bold text-foreground mb-4 text-sm">موادي التعليمية</h2>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-xs text-muted-foreground">لم يتم إسناد أي مواد بعد. يرجى التواصل مع المدير.</p>
            ) : (
              <div className="space-y-2.5">
                {subjects.slice(0, 5).map(subject => (
                  <div key={subject.id} className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "#F5F3FF" }}
                    >
                      <BookOpen className="w-3.5 h-3.5" style={{ color: "#7C3AED" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{subject.titleAr}</p>
                      <p className="text-[10px] text-muted-foreground">{TRACK_LABELS[subject.gradeLevel] || subject.gradeLevel}</p>
                    </div>
                  </div>
                ))}
                {subjects.length > 5 && (
                  <p className="text-xs text-muted-foreground mt-1">و {subjects.length - 5} مواد أخرى...</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
