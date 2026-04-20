import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { useListUsers, useUpdateUserAccess, useUpdateUserStars, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { GRADE_CONFIG, getApiBaseUrl } from "@/lib/utils";
import { Search, Star, Loader2, Users, ChevronLeft, ChevronRight, CheckCircle, LogIn, CreditCard, UserX, Plus, Pencil, Trash2, X, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ROLE_OPTIONS = [
  { value: "free",  labelAr: "مجاني",  color: "#6B7280", bg: "rgba(107,114,128,0.12)" },
  { value: "paid",  labelAr: "مدفوع",  color: "#16A34A", bg: "rgba(22,163,74,0.12)"  },
] as const;

type Role = typeof ROLE_OPTIONS[number]["value"];

const GRADE_FILTER_OPTIONS = [
  { key: "",            labelAr: "كل المسارات" },
  { key: "grade9",      labelAr: "الصف التاسع" },
  { key: "grade12_sci", labelAr: "بكالوريا علمي" },
  { key: "grade12_lit", labelAr: "بكالوريا أدبي" },
  { key: "english",     labelAr: "اللغة الإنجليزية" },
  { key: "ielts",       labelAr: "تحضير الآيلتس" },
  { key: "steps1000",   labelAr: "مشروع 1000 خطوة" },
];

const GRADE_LEVEL_OPTIONS = GRADE_FILTER_OPTIONS.filter(o => o.key !== "");

const createSchema = z.object({
  studentId: z.string().min(1, "رقم الطالب مطلوب"),
  fullName: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "الهاتف مطلوب"),
  gradeLevel: z.string().min(1, "المرحلة مطلوبة"),
  accessRole: z.enum(["free", "paid"]).default("free"),
  password: z.string().min(4, "كلمة المرور 4 أحرف على الأقل"),
});

const editSchema = z.object({
  fullName: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "الهاتف مطلوب"),
  gradeLevel: z.string().min(1, "المرحلة مطلوبة"),
  accessRole: z.enum(["free", "paid"]),
  password: z.string().optional(),
});

type CreateForm = z.infer<typeof createSchema>;
type EditForm = z.infer<typeof editSchema>;

function RoleIcon({ role }: { role: string }) {
  if (role === "paid") return <CreditCard className="w-3 h-3" />;
  return <UserX className="w-3 h-3" />;
}

function FieldInput({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {children}
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  );
}

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [editingStars, setEditingStars] = useState<Record<string, string>>({});
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Paid subject IDs for the edit modal
  const [editPaidSubjectIds, setEditPaidSubjectIds] = useState<number[]>([]);
  const [editSubjectsList, setEditSubjectsList] = useState<any[]>([]);
  const [loadingEditSubjects, setLoadingEditSubjects] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { login } = useAuth();
  const [, setLocation] = useLocation();

  const params = { search: debouncedSearch || undefined, gradeLevel: gradeFilter || undefined, page, limit: 15 };
  const { data: usersData, isLoading } = useListUsers(params, {
    query: { queryKey: getListUsersQueryKey(params) }
  });
  const updateAccess = useUpdateUserAccess();
  const updateStars = useUpdateUserStars();

  const data = usersData as any;
  const userList = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { studentId: "", fullName: "", phone: "", gradeLevel: "grade9", accessRole: "free", password: "" },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const watchedEditRole = editForm.watch("accessRole");
  const watchedEditGrade = editForm.watch("gradeLevel");

  // Reload subjects when grade changes in edit modal (while modal is open and role is paid)
  useEffect(() => {
    if (!editingStudent || !watchedEditGrade) return;
    if (watchedEditRole !== "paid") { setEditSubjectsList([]); return; }
    const token = localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token");
    setLoadingEditSubjects(true);
    fetch(`${getApiBaseUrl()}/subjects?gradeLevel=${watchedEditGrade}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setEditSubjectsList(Array.isArray(d) ? d : []))
      .catch(() => setEditSubjectsList([]))
      .finally(() => setLoadingEditSubjects(false));
  }, [watchedEditGrade, watchedEditRole, editingStudent]);

  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__searchTimer);
    (window as any).__searchTimer = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 400);
  };

  const handleRoleChange = (studentId: string, newRole: Role) => {
    setChangingRole(studentId);
    updateAccess.mutate(
      { studentId, data: { accessRole: newRole as any } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(params) });
          const roleLabel = ROLE_OPTIONS.find(r => r.value === newRole)?.labelAr ?? newRole;
          toast({ title: "تم التحديث", description: `تم تغيير دور ${studentId} إلى ${roleLabel}` });
        },
        onError: () => toast({ title: "خطأ", description: "فشل تحديث الدور", variant: "destructive" }),
        onSettled: () => setChangingRole(null),
      }
    );
  };

  const handleImpersonate = async (studentId: string) => {
    setImpersonating(studentId);
    try {
      const token = localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token");
      const res = await fetch(`${getApiBaseUrl()}/users/${studentId}/impersonate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const resData = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: resData.message || "فشل تسجيل الدخول", variant: "destructive" });
        return;
      }
      login(resData.token, resData.user);
      toast({ title: `الدخول كـ ${resData.user.fullName}`, description: "أنت الآن تتصفح بوصفك هذا الطالب." });
      setLocation("/");
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setImpersonating(null);
    }
  };

  const handleStarsUpdate = (studentId: string) => {
    const val = parseInt(editingStars[studentId] || "0");
    if (isNaN(val) || val < 0) {
      toast({ title: "خطأ", description: "قيمة النجوم غير صالحة", variant: "destructive" });
      return;
    }
    updateStars.mutate(
      { studentId, data: { starsBalance: val } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(params) });
          setEditingStars(prev => { const n = { ...prev }; delete n[studentId]; return n; });
          toast({ title: "تم التحديث", description: "تم تحديث رصيد النجوم" });
        },
        onError: () => toast({ title: "خطأ", description: "فشل تحديث النجوم", variant: "destructive" }),
      }
    );
  };

  const authFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token");
    return fetch(`${getApiBaseUrl()}${url}`, {
      ...options,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
  };

  const handleCreate = async (formData: CreateForm) => {
    setIsSubmitting(true);
    try {
      const res = await authFetch("/users", { method: "POST", body: JSON.stringify(formData) });
      const resData = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: resData.message || "فشل إنشاء الطالب", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(params) });
      toast({ title: "تم إنشاء الطالب بنجاح", description: `${formData.studentId} — ${formData.fullName}` });
      setShowCreate(false);
      createForm.reset();
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (student: any) => {
    setEditingStudent(student);
    setEditPaidSubjectIds(student.paidSubjectIds ?? []);
    setEditSubjectsList([]);
    editForm.reset({
      fullName: student.fullName,
      phone: student.phone,
      gradeLevel: student.gradeLevel,
      accessRole: student.accessRole,
      password: "",
    });
  };

  const handleEdit = async (formData: EditForm) => {
    if (!editingStudent) return;
    setIsSubmitting(true);
    const payload: Record<string, any> = {
      fullName: formData.fullName,
      phone: formData.phone,
      gradeLevel: formData.gradeLevel,
      accessRole: formData.accessRole,
      paidSubjectIds: formData.accessRole === "paid" ? editPaidSubjectIds : [],
    };
    if (formData.password && formData.password.length >= 4) {
      payload.password = formData.password;
    }
    try {
      const res = await authFetch(`/users/${editingStudent.studentId}`, { method: "PUT", body: JSON.stringify(payload) });
      const resData = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: resData.message || "فشل التعديل", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(params) });
      toast({ title: "تم التعديل بنجاح" });
      setEditingStudent(null);
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch(`/users/${deletingStudent.studentId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const resData = await res.json().catch(() => ({}));
        toast({ title: "خطأ", description: resData.message || "فشل الحذف", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey(params) });
      toast({ title: "تم حذف الطالب", description: `${deletingStudent.fullName} (${deletingStudent.studentId})` });
      setDeletingStudent(null);
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const selectCls = inputCls;

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">إدارة المستخدمين</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} مستخدم مسجل</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); createForm.reset(); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          data-testid="btn-create-student"
        >
          <Plus className="w-4 h-4" />
          <span>طالب جديد</span>
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ROLE_OPTIONS.map(r => (
          <span key={r.value} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ color: r.color, background: r.bg }}>
            <RoleIcon role={r.value} />
            {r.labelAr}
          </span>
        ))}
        <span className="text-xs text-muted-foreground self-center mr-1">— انقر على الدور لتغييره</span>
      </div>

      {/* Grade Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        {GRADE_FILTER_OPTIONS.map((opt) => {
          const cfg = opt.key ? GRADE_CONFIG[opt.key] : null;
          const isActive = gradeFilter === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => { setGradeFilter(opt.key); setPage(1); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={isActive
                ? { backgroundColor: cfg?.primary || "#0057bd", color: "#fff" }
                : { backgroundColor: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))" }
              }
              data-testid={`grade-filter-${opt.key || "all"}`}
            >
              {opt.labelAr}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="ابحث بالاسم أو رقم الطالب..."
          className="w-full pr-10 pl-4 py-2.5 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
          data-testid="input-search"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : userList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد نتائج</p>
        </div>
      ) : (
        <div className="space-y-2">
          {userList.map((user: any) => {
            const gradeConfig = GRADE_CONFIG[user.gradeLevel];
            const isEditingStars = editingStars[user.studentId] !== undefined;
            const roleConfig = ROLE_OPTIONS.find(r => r.value === user.accessRole) ?? ROLE_OPTIONS[0];
            const isChangingThisRole = changingRole === user.studentId;

            return (
              <div key={user.studentId} className="bg-card border border-card-border rounded-xl p-4" data-testid={`student-${user.studentId}`}>
                <div className="flex items-start gap-3 flex-wrap">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: gradeConfig?.primaryLight || "rgba(0,87,189,0.1)", color: gradeConfig?.primary || "#0057bd" }}>
                    {user.fullName.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{user.fullName}</p>
                      <span className="text-xs text-muted-foreground ltr font-mono">{user.studentId}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs" style={{ color: gradeConfig?.primary }}>{gradeConfig?.labelAr}</span>
                      <span className="text-xs text-muted-foreground ltr">{user.phone}</span>
                      {user.accessRole === "paid" && Array.isArray(user.paidSubjectIds) && user.paidSubjectIds.length > 0 && (
                        <span className="text-xs text-emerald-600 font-semibold">{user.paidSubjectIds.length} مادة مدفوعة</span>
                      )}
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-current text-primary flex-shrink-0" />
                    {isEditingStars ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingStars[user.studentId]}
                          onChange={(e) => setEditingStars(prev => ({ ...prev, [user.studentId]: e.target.value }))}
                          className="w-20 px-2 py-1 bg-input border border-border rounded text-foreground text-sm ltr text-center focus:outline-none focus:ring-1 focus:ring-ring"
                          data-testid={`stars-input-${user.studentId}`}
                        />
                        <button onClick={() => handleStarsUpdate(user.studentId)} className="p-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30" data-testid={`stars-save-${user.studentId}`}>
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingStars(prev => { const n = { ...prev }; delete n[user.studentId]; return n; })} className="p-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 text-xs">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditingStars(prev => ({ ...prev, [user.studentId]: String(user.starsBalance) }))} className="text-sm font-bold text-primary hover:underline" data-testid={`stars-edit-${user.studentId}`}>
                        {user.starsBalance}
                      </button>
                    )}
                  </div>

                  {/* Role Buttons */}
                  <div className="relative flex-shrink-0">
                    {isChangingThisRole ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ color: roleConfig.color, background: roleConfig.bg }}>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>جاري...</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {ROLE_OPTIONS.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => { if (opt.value !== user.accessRole) handleRoleChange(user.studentId, opt.value as Role); }}
                            title={opt.labelAr}
                            data-testid={`role-${opt.value}-${user.studentId}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={opt.value === user.accessRole
                              ? { color: opt.color, background: opt.bg, outline: `1.5px solid ${opt.color}` }
                              : { color: "#9CA3AF", background: "transparent", outline: "1.5px solid transparent" }
                            }
                          >
                            <RoleIcon role={opt.value} />
                            <span>{opt.labelAr}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleImpersonate(user.studentId)}
                      disabled={impersonating === user.studentId}
                      title="الدخول لحساب المستخدم"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all flex items-center gap-1"
                      data-testid={`impersonate-${user.studentId}`}
                    >
                      {impersonating === user.studentId ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => openEdit(user)}
                      title="تعديل بيانات الطالب"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      data-testid={`edit-${user.studentId}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingStudent(user)}
                      title="حذف الطالب"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                      data-testid={`delete-${user.studentId}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg bg-card border border-card-border hover:border-primary/40 disabled:opacity-40">
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg bg-card border border-card-border hover:border-primary/40 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
        </div>
      )}

      {/* ─── CREATE STUDENT MODAL ─── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-foreground text-lg">إضافة طالب جديد</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4">
              <FieldInput label="رقم الطالب" error={createForm.formState.errors.studentId?.message}>
                <input {...createForm.register("studentId")} placeholder="مثال: G9-0050" className={`${inputCls} ltr`} dir="ltr" data-testid="input-studentId" />
              </FieldInput>
              <FieldInput label="الاسم الكامل" error={createForm.formState.errors.fullName?.message}>
                <input {...createForm.register("fullName")} placeholder="اسم الطالب" className={inputCls} data-testid="input-fullName" />
              </FieldInput>
              <FieldInput label="رقم الهاتف" error={createForm.formState.errors.phone?.message}>
                <input {...createForm.register("phone")} placeholder="09xxxxxxxx" className={`${inputCls} ltr`} dir="ltr" data-testid="input-phone" />
              </FieldInput>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="المرحلة الدراسية" error={createForm.formState.errors.gradeLevel?.message}>
                  <select {...createForm.register("gradeLevel")} className={selectCls} data-testid="select-gradeLevel">
                    {GRADE_LEVEL_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.labelAr}</option>)}
                  </select>
                </FieldInput>
                <FieldInput label="نوع الحساب" error={createForm.formState.errors.accessRole?.message}>
                  <select {...createForm.register("accessRole")} className={selectCls} data-testid="select-accessRole">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.labelAr}</option>)}
                  </select>
                </FieldInput>
              </div>
              <FieldInput label="كلمة المرور" error={createForm.formState.errors.password?.message}>
                <div className="relative">
                  <input {...createForm.register("password")} type={showPassword ? "text" : "password"} placeholder="كلمة المرور الأولية" className={`${inputCls} pl-10 ltr`} dir="ltr" data-testid="input-password" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FieldInput>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60" data-testid="btn-save-create">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>إضافة الطالب</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT STUDENT MODAL ─── */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-foreground text-lg">تعديل بيانات الطالب</h2>
                <p className="text-xs text-muted-foreground mt-0.5 ltr">{editingStudent.studentId}</p>
              </div>
              <button onClick={() => setEditingStudent(null)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-4">
              <FieldInput label="الاسم الكامل" error={editForm.formState.errors.fullName?.message}>
                <input {...editForm.register("fullName")} className={inputCls} data-testid="input-edit-fullName" />
              </FieldInput>
              <FieldInput label="رقم الهاتف" error={editForm.formState.errors.phone?.message}>
                <input {...editForm.register("phone")} className={`${inputCls} ltr`} dir="ltr" data-testid="input-edit-phone" />
              </FieldInput>
              <div className="grid grid-cols-2 gap-3">
                <FieldInput label="المرحلة الدراسية">
                  <select {...editForm.register("gradeLevel")} className={selectCls} data-testid="select-edit-gradeLevel">
                    {GRADE_LEVEL_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.labelAr}</option>)}
                  </select>
                </FieldInput>
                <FieldInput label="نوع الحساب">
                  <select {...editForm.register("accessRole")} className={selectCls} data-testid="select-edit-accessRole">
                    {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.labelAr}</option>)}
                  </select>
                </FieldInput>
              </div>

              {/* ─── Paid Subject Picker (only when role = paid) ─── */}
              {watchedEditRole === "paid" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    المواد المدفوعة
                    {editPaidSubjectIds.length > 0 && (
                      <span className="mr-2 text-xs font-normal text-emerald-600">({editPaidSubjectIds.length} مختارة)</span>
                    )}
                  </label>
                  {loadingEditSubjects ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : editSubjectsList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 border border-dashed border-border rounded-lg text-center py-3">
                      لا توجد مواد لهذا المسار
                    </p>
                  ) : (
                    <div className="max-h-44 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {editSubjectsList.map((subj: any) => {
                        const checked = editPaidSubjectIds.includes(subj.id);
                        return (
                          <label
                            key={subj.id}
                            className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-emerald-50 dark:bg-emerald-900/20" : "hover:bg-muted/40"}`}
                          >
                            <input
                              type="checkbox"
                              className="rounded accent-emerald-600 w-4 h-4 flex-shrink-0"
                              checked={checked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setEditPaidSubjectIds(prev => [...prev, subj.id]);
                                } else {
                                  setEditPaidSubjectIds(prev => prev.filter(id => id !== subj.id));
                                }
                              }}
                            />
                            <span className="text-sm text-foreground flex-1">{subj.titleAr}</span>
                            {checked && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <FieldInput label="كلمة مرور جديدة (اختياري)" error={editForm.formState.errors.password?.message}>
                <div className="relative">
                  <input {...editForm.register("password")} type={showEditPassword ? "text" : "password"} placeholder="اتركه فارغاً للإبقاء على القديم" className={`${inputCls} pl-10 ltr`} dir="ltr" data-testid="input-edit-password" />
                  <button type="button" onClick={() => setShowEditPassword(v => !v)} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FieldInput>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">إلغاء</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60" data-testid="btn-save-edit">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>حفظ التعديلات</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="font-bold text-foreground text-lg mb-2">تأكيد الحذف</h2>
            <p className="text-sm text-muted-foreground mb-1">
              هل أنت متأكد أنك تريد حذف هذا الطالب؟
            </p>
            <p className="text-sm font-semibold text-foreground mb-1">{deletingStudent.fullName}</p>
            <p className="text-xs text-muted-foreground ltr mb-6">{deletingStudent.studentId}</p>
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 mb-6">
              ⚠️ هذه العملية لا يمكن التراجع عنها. سيتم حذف بيانات الطالب نهائياً.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingStudent(null)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">إلغاء</button>
              <button onClick={handleDelete} disabled={isSubmitting} className="flex-1 py-2.5 bg-destructive text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60" data-testid="btn-confirm-delete">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>حذف نهائي</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
