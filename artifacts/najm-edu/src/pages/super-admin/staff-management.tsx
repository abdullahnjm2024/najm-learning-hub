import { useState, useEffect, useCallback } from "react";
import { useStaffAuth, fetchWithStaffAuth } from "@/contexts/StaffAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Layout } from "@/components/Layout";
import {
  Loader2, Plus, Pencil, Trash2, X, Check,
  Users, GraduationCap, Shield, Eye, EyeOff, UserCheck, UserX, BookOpen
} from "lucide-react";

interface SubjectOption {
  id: number;
  titleAr: string;
  gradeLevel: string;
}

const TRACKS = [
  { value: "grade9",      label: "الصف التاسع" },
  { value: "grade12_sci", label: "بكالوريا علمي" },
  { value: "grade12_lit", label: "بكالوريا أدبي" },
  { value: "english",     label: "كورسات إنجليزي" },
  { value: "steps1000",   label: "مشروع ألف خطوة" },
  { value: "ielts",       label: "تحضير آيلتس" },
];

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  teacher:    { label: "معلم",    color: "#2563EB", bg: "#EFF6FF" },
  supervisor: { label: "مشرف",   color: "#7C3AED", bg: "#F5F3FF" },
  super_admin:{ label: "مدير عام", color: "#D97706", bg: "#FFFBEB" },
};

interface AdminMember {
  id: number;
  adminId: string;
  fullName: string;
  role: "teacher" | "supervisor";
  assignedTracks: string[];
  assignedSubjectIds: number[];
  isActive: boolean;
  createdAt: string;
}

interface AdminForm {
  adminId: string;
  password: string;
  fullName: string;
  role: "teacher" | "supervisor";
  assignedTracks: string[];
  assignedSubjectIds: number[];
  isActive: boolean;
}

const EMPTY_FORM: AdminForm = {
  adminId: "", password: "", fullName: "",
  role: "teacher", assignedTracks: [], assignedSubjectIds: [], isActive: true,
};

export default function StaffManagementPage() {
  const { staff } = useStaffAuth();
  const { toast } = useToast();

  const [adminList, setAdminList] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "teacher" | "supervisor">("all");
  const [allSubjects, setAllSubjects] = useState<SubjectOption[]>([]);

  useEffect(() => {
    fetchWithStaffAuth("/subjects")
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllSubjects(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithStaffAuth("/staff/management/staff");
      if (res.ok) setAdminList(await res.json());
    } catch {
      toast({ title: "خطأ", description: "فشل تحميل قائمة الإدارة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setShowForm(true);
  };

  const openEdit = (member: AdminMember) => {
    setEditingId(member.id);
    setForm({
      adminId: member.adminId,
      password: "",
      fullName: member.fullName,
      role: member.role,
      assignedTracks: member.assignedTracks,
      assignedSubjectIds: member.assignedSubjectIds,
      isActive: member.isActive,
    });
    setShowPassword(false);
    setShowForm(true);
  };

  const toggleTrack = (track: string) => {
    setForm(f => ({
      ...f,
      assignedTracks: f.assignedTracks.includes(track)
        ? f.assignedTracks.filter(t => t !== track)
        : [...f.assignedTracks, track],
    }));
  };

  const toggleSubject = (id: number) => {
    setForm(f => ({
      ...f,
      assignedSubjectIds: f.assignedSubjectIds.includes(id)
        ? f.assignedSubjectIds.filter(s => s !== id)
        : [...f.assignedSubjectIds, id],
    }));
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim() || !form.adminId.trim()) {
      toast({ title: "خطأ", description: "الاسم والرقم الإداري مطلوبان", variant: "destructive" });
      return;
    }
    if (!editingId && !form.password) {
      toast({ title: "خطأ", description: "كلمة المرور مطلوبة عند الإنشاء", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        adminId: form.adminId.toUpperCase().trim(),
        fullName: form.fullName,
        role: form.role,
        assignedTracks: form.assignedTracks,
        assignedSubjectIds: form.assignedSubjectIds,
        isActive: form.isActive,
      };
      if (form.password) body.password = form.password;

      const res = editingId
        ? await fetchWithStaffAuth(`/staff/management/staff/${editingId}`, { method: "PUT", body: JSON.stringify(body) })
        : await fetchWithStaffAuth("/staff/management/staff", { method: "POST", body: JSON.stringify(body) });

      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message || "فشلت العملية", variant: "destructive" });
        return;
      }
      toast({ title: editingId ? "تم التحديث" : "تم الإنشاء", description: `تم ${editingId ? "تحديث" : "إضافة"} ${form.fullName} بنجاح` });
      setShowForm(false);
      loadAdmins();
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف حساب "${name}"؟`)) return;
    setDeletingId(id);
    try {
      await fetchWithStaffAuth(`/staff/management/staff/${id}`, { method: "DELETE" });
      toast({ title: "تم الحذف", description: `تم حذف حساب ${name}` });
      loadAdmins();
    } catch {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (member: AdminMember) => {
    try {
      await fetchWithStaffAuth(`/staff/management/staff/${member.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      toast({ title: member.isActive ? "تم التعطيل" : "تم التفعيل", description: `${member.fullName}` });
      loadAdmins();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const filtered = adminList.filter(m =>
    activeTab === "all" || m.role === activeTab
  );

  const counts = {
    all: adminList.length,
    teacher: adminList.filter(m => m.role === "teacher").length,
    supervisor: adminList.filter(m => m.role === "supervisor").length,
  };

  return (
    <Layout>
      <div dir="rtl" style={{ fontFamily: "'Manrope', 'IBM Plex Sans Arabic', sans-serif" }}>
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(251,191,36,0.15)" }}>
              <Shield className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
                إدارة الكادر الإداري
              </h1>
              <p className="text-xs text-muted-foreground">{staff?.fullName} · {staff?.adminId}</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
            style={{ background: "#0057bd" }}
          >
            <Plus className="w-4 h-4" />
            إضافة عضو إداري
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { key: "all",        label: "إجمالي الكادر الإداري", Icon: Users,         color: "#0057bd" },
            { key: "teacher",    label: "المعلمون",               Icon: GraduationCap, color: "#2563EB" },
            { key: "supervisor", label: "المشرفون",               Icon: Shield,        color: "#7C3AED" },
          ].map(({ key, label, Icon, color }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className="text-right p-5 rounded-2xl bg-white transition-all hover:shadow-md"
              style={{
                border: activeTab === key ? `2px solid ${color}` : "1px solid rgba(160,174,198,0.15)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-black" style={{ color }}>{counts[key as keyof typeof counts]}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-foreground">
              {activeTab === "all" ? "جميع أعضاء الكادر الإداري" : activeTab === "teacher" ? "المعلمون" : "المشرفون"}
            </h2>
            <span className="text-xs text-muted-foreground">{filtered.length} عضو</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#0057bd]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-muted-foreground text-sm">لا يوجد أعضاء إداريون بعد. ابدأ بإضافة معلم أو مشرف.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map(member => {
                const roleConfig = ROLE_LABELS[member.role];
                return (
                  <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                      style={{ background: roleConfig.bg, color: roleConfig.color }}
                    >
                      {member.fullName.charAt(0)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-foreground text-sm">{member.fullName}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: roleConfig.bg, color: roleConfig.color }}
                        >
                          {roleConfig.label}
                        </span>
                        {!member.isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-500">معطل</span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">{member.adminId}</p>
                      {member.assignedTracks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {member.assignedTracks.map(t => {
                            const track = TRACKS.find(x => x.value === t);
                            return (
                              <span key={t} className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-[#EBF1FF] text-[#0057bd]">
                                {track?.label || t}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(member)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition"
                        title={member.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                        style={{ color: member.isActive ? "#22C55E" : "#9CA3AF" }}
                      >
                        {member.isActive ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(member)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100 transition text-[#0057bd]"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.fullName)}
                        disabled={deletingId === member.id}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition text-red-400"
                      >
                        {deletingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showForm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(33,47,67,0.5)", backdropFilter: "blur(6px)" }}
            onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
          >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" style={{ border: "1px solid rgba(160,174,198,0.2)" }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-black text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
                  {editingId ? "تعديل بيانات العضو" : "إضافة عضو إداري جديد"}
                </h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">الاسم الكامل *</label>
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                    placeholder="اسم المعلم أو المشرف"
                    className="w-full px-4 py-2.5 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">الرقم الإداري *</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#0057bd] bg-[#EBF1FF] px-1.5 py-0.5 rounded">
                      ADMIN-
                    </span>
                    <input
                      type="text"
                      dir="ltr"
                      value={form.adminId.replace(/^ADMIN-/i, "")}
                      onChange={e => setForm(f => ({ ...f, adminId: "ADMIN-" + e.target.value.toUpperCase().replace(/^ADMIN-/i, "") }))}
                      placeholder="001"
                      className="w-full pl-4 pr-20 py-2.5 rounded-xl bg-muted text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                      style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">سيُستخدم للدخول: {form.adminId || "ADMIN-..."}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    كلمة المرور {editingId ? "(اتركها فارغة لإبقائها)" : "*"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder={editingId ? "اتركها فارغة لعدم التغيير" : "كلمة المرور"}
                      dir="ltr"
                      className="w-full px-4 pl-10 py-2.5 rounded-xl bg-muted text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                      style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">الدور الوظيفي *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["teacher", "supervisor"] as const).map(role => {
                      const cfg = ROLE_LABELS[role];
                      const active = form.role === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, role }))}
                          className="py-2.5 rounded-xl text-sm font-bold transition-all"
                          style={{
                            background: active ? cfg.bg : "var(--muted)",
                            color: active ? cfg.color : "var(--muted-foreground)",
                            border: active ? `1.5px solid ${cfg.color}` : "1.5px solid rgba(160,174,198,0.4)",
                          }}
                        >
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">المسارات المُسندة</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TRACKS.map(track => {
                      const selected = form.assignedTracks.includes(track.value);
                      return (
                        <button
                          key={track.value}
                          type="button"
                          onClick={() => toggleTrack(track.value)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-right"
                          style={{
                            background: selected ? "#EBF1FF" : "var(--muted)",
                            color: selected ? "#0057bd" : "var(--muted-foreground)",
                            border: selected ? "1.5px solid #0057bd" : "1.5px solid rgba(160,174,198,0.4)",
                          }}
                        >
                          {selected ? <Check className="w-3 h-3 flex-shrink-0" /> : <div className="w-3 h-3 flex-shrink-0" />}
                          {track.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.role === "teacher" && (
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      المواد المُسندة للمعلم
                    </label>
                    {allSubjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1">
                        لا توجد مواد متاحة. أضف مواد من قسم المواد أولاً.
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto rounded-xl border space-y-0.5 p-1" style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}>
                        {allSubjects.map(subject => {
                          const selected = form.assignedSubjectIds.includes(subject.id);
                          return (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => toggleSubject(subject.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all text-right"
                              style={{
                                background: selected ? "#F5F3FF" : "transparent",
                                color: selected ? "#7C3AED" : "var(--muted-foreground)",
                              }}
                            >
                              {selected
                                ? <Check className="w-3 h-3 flex-shrink-0 text-purple-600" />
                                : <div className="w-3 h-3 flex-shrink-0 rounded border" style={{ borderColor: "rgba(160,174,198,0.6)" }} />
                              }
                              <span className="flex-1 truncate">{subject.titleAr}</span>
                              <span className="text-[10px] opacity-60 flex-shrink-0">
                                {TRACKS.find(t => t.value === subject.gradeLevel)?.label || subject.gradeLevel}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {form.assignedSubjectIds.length > 0 && (
                      <p className="text-xs text-purple-600 font-medium mt-1 px-1">
                        {form.assignedSubjectIds.length} مادة مُختارة
                      </p>
                    )}
                  </div>
                )}

                {editingId && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: "var(--muted)", border: "1.5px solid rgba(160,174,198,0.4)" }}>
                    <span className="text-sm font-semibold text-foreground">حالة الحساب</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className="text-sm font-bold flex items-center gap-1.5 transition"
                      style={{ color: form.isActive ? "#22C55E" : "#EF4444" }}
                    >
                      {form.isActive ? <><UserCheck className="w-4 h-4" /> مفعّل</> : <><UserX className="w-4 h-4" /> معطّل</>}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition"
                  style={{ background: "#0057bd" }}
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {editingId ? "حفظ التعديلات" : "إنشاء الحساب"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
