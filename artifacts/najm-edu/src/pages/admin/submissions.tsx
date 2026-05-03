import { useState } from "react";
import { Layout } from "@/components/Layout";
import { ADMIN_THEME, getApiBaseUrl } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare, Loader2, ChevronDown, ChevronUp, Send,
  Clock, CheckCircle2, Search, RefreshCw
} from "lucide-react";

const API = getApiBaseUrl();
const tok = () => localStorage.getItem("najm_staff_token") || localStorage.getItem("najm_token") || "";
const authFetch = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${tok()}` } }).then(r => {
    if (!r.ok) throw new Error("fetch_error");
    return r.json();
  });

const GRADE_LABELS: Record<string, string> = {
  grade9: "الصف التاسع",
  grade12_sci: "بكالوريا علمي",
  grade12_lit: "بكالوريا أدبي",
  english: "اللغة الإنجليزية",
  ielts: "تحضير الآيلتس",
  steps1000: "مشروع 1000 خطوة",
};

interface Submission {
  id: number;
  content: string;
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
  lessonId: number;
  studentId: number;
  studentName: string | null;
  studentCode: string | null;
  gradeLevel: string | null;
  lessonTitle: string | null;
}

function SubmissionCard({ sub, theme }: { sub: Submission; theme: typeof ADMIN_THEME }) {
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState(sub.adminReply ?? "");
  const [localReply, setLocalReply] = useState<string | null>(sub.adminReply);
  const { toast } = useToast();
  const qc = useQueryClient();

  const replyMutation = useMutation({
    mutationFn: () =>
      fetch(`${API}/admin/submissions/${sub.id}/reply`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${tok()}`, "Content-Type": "application/json" },
        body: JSON.stringify({ adminReply: replyText.trim() }),
      }).then(r => { if (!r.ok) throw new Error("reply_error"); return r.json(); }),
    onSuccess: (data) => {
      setLocalReply(data.adminReply);
      setExpanded(false);
      qc.invalidateQueries({ queryKey: ["admin-submissions"] });
      toast({ title: "تم إرسال الرد ✅", description: `رددت على ${sub.studentName ?? "الطالب"}` });
    },
    onError: () => {
      toast({ title: "خطأ في الإرسال", description: "لم يتم حفظ الرد، حاول مجدداً", variant: "destructive" });
    },
  });

  const hasReply = !!localReply;

  return (
    <div
      className="rounded-2xl border bg-card overflow-hidden transition-all"
      style={{ borderColor: hasReply ? "rgba(16,185,129,0.25)" : "rgba(160,174,198,0.2)" }}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: theme.primary }}
            >
              {(sub.studentName ?? "؟").charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground text-sm truncate" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                {sub.studentName ?? "طالب غير معروف"}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {sub.studentCode && (
                  <span className="text-xs text-muted-foreground font-mono">{sub.studentCode}</span>
                )}
                {sub.gradeLevel && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: theme.primaryLight, color: theme.primary }}
                  >
                    {GRADE_LABELS[sub.gradeLevel] ?? sub.gradeLevel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
            style={hasReply
              ? { background: "rgba(16,185,129,0.1)", color: "#10B981" }
              : { background: "rgba(245,158,11,0.1)", color: "#F59E0B" }}
          >
            {hasReply
              ? <><CheckCircle2 className="w-3 h-3" /> تم الرد ✅</>
              : <><Clock className="w-3 h-3" /> بانتظار الرد ⏳</>}
          </span>
        </div>

        {sub.lessonTitle && (
          <div className="flex items-center gap-1.5 mb-3">
            <MessageSquare className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              {sub.lessonTitle}
            </span>
          </div>
        )}

        <div className="rounded-xl p-3.5 mb-3" style={{ background: theme.primaryLight }}>
          <p
            className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
          >
            {sub.content}
          </p>
        </div>

        {hasReply && !expanded && (
          <div
            className="rounded-xl p-3.5 mb-3 border"
            style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
          >
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1.5" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              ردك 👨‍🏫
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              {localReply}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {new Date(sub.createdAt).toLocaleDateString("ar-SA", {
              year: "numeric", month: "long", day: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
            style={{ background: theme.primaryLight, color: theme.primary }}
          >
            {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> إغلاق</> : <><ChevronDown className="w-3.5 h-3.5" /> {hasReply ? "تعديل الرد" : "الرد على الرسالة"}</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t" style={{ borderColor: "rgba(160,174,198,0.15)" }}>
          <div className="pt-4 space-y-3">
            <label className="text-sm font-bold text-foreground" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              {hasReply ? "تعديل ردك" : "اكتب ردك على الطالب"} 👨‍🏫
            </label>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="اكتب ردك هنا..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none leading-relaxed"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
              onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}40`; }}
              onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
              disabled={replyMutation.isPending}
              dir="rtl"
            />
            <button
              onClick={() => { if (replyText.trim()) replyMutation.mutate(); }}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: theme.primary, fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              {replyMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري الإرسال...</span></>
                : <><Send className="w-4 h-4" /><span>إرسال الرد ✉️</span></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminSubmissions() {
  const theme = ADMIN_THEME;
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");

  const { data: submissions = [], isLoading, refetch, isRefetching } = useQuery<Submission[]>({
    queryKey: ["admin-submissions"],
    queryFn: () => authFetch(`${API}/admin/submissions`),
    refetchInterval: 30_000,
  });

  const filtered = (submissions as Submission[]).filter(s => {
    const matchesSearch =
      !search ||
      s.studentName?.includes(search) ||
      s.studentCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.lessonTitle?.includes(search) ||
      s.content.includes(search);

    const matchesFilter =
      filter === "all" ||
      (filter === "pending" && !s.adminReply) ||
      (filter === "replied" && !!s.adminReply);

    return matchesSearch && matchesFilter;
  });

  const pendingCount = (submissions as Submission[]).filter(s => !s.adminReply).length;

  return (
    <Layout>
      <div dir="rtl">
        <div className="mb-6">
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, rgba(244,246,255,0.5) 100%)` }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.primaryLight }}>
              <MessageSquare className="w-6 h-6" style={{ color: theme.primary }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-xl font-extrabold text-foreground leading-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
              >
                رسائل الطلاب 📬
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                واجبات واستفسارات الطلاب — الرد مباشرةً من هنا
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {pendingCount > 0 && (
                <span className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#F59E0B" }}>
                  <Clock className="w-4 h-4" /> {pendingCount} بانتظار الرد
                </span>
              )}
              <button
                onClick={() => { refetch(); }}
                disabled={isRefetching}
                className="p-2.5 rounded-xl transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: theme.primaryLight, color: theme.primary }}
                title="تحديث"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ابحث باسم الطالب، الدرس، أو المحتوى..."
              className="w-full rounded-xl border border-border bg-background pr-10 pl-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
              onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.primary}40`; }}
              onBlur={e => { e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "replied"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={filter === f
                  ? { background: theme.primary, color: "#fff" }
                  : { background: theme.primaryLight, color: theme.primary }}
              >
                {f === "all" ? "الكل" : f === "pending" ? "⏳ بانتظار الرد" : "✅ تم الرد"}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin" style={{ color: theme.primary }} />
              <span className="text-muted-foreground text-sm">جاري تحميل الرسائل...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: theme.primaryLight }}>
              <MessageSquare className="w-8 h-8" style={{ color: theme.primary }} />
            </div>
            <p className="font-bold text-foreground mb-1" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              {search || filter !== "all" ? "لا توجد نتائج مطابقة" : "لا توجد رسائل بعد"}
            </p>
            <p className="text-sm text-muted-foreground">
              {search || filter !== "all" ? "جرب تغيير معايير البحث أو التصفية" : "سيظهر هنا ما يرسله الطلاب من واجبات واستفسارات"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(sub => (
              <SubmissionCard key={sub.id} sub={sub} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
