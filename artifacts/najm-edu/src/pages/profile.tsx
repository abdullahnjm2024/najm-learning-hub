import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { GRADE_CONFIG, ADMIN_THEME, getApiBaseUrl } from "@/lib/utils";
import { useGetMyRank, getGetMyRankQueryKey } from "@workspace/api-client-react";
import { Star, Trophy, Shield, User, Bell, BellOff, Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { user, isPaid } = useAuth();
  const { toast } = useToast();
  const grade = user?.gradeLevel || "grade9";
  const theme = GRADE_CONFIG[grade] ?? ADMIN_THEME;
  const token = localStorage.getItem("najm_token");

  const { data: myRank } = useGetMyRank({ query: { queryKey: getGetMyRankQueryKey(), enabled: !!user } });

  const rankData = myRank as any;

  const { permission, isSubscribed, isLoading: pushLoading, isSupported, subscribe, unsubscribe } = usePushNotifications(token);

  // Change Password state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwLoading, setPwLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة وتأكيدها غير متطابقتين", variant: "destructive" });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast({ title: "خطأ", description: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "خطأ", description: data.message || "فشل تغيير كلمة المرور", variant: "destructive" });
      } else {
        toast({ title: "تم بنجاح", description: "تم تغيير كلمة المرور بنجاح" });
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch {
      toast({ title: "خطأ", description: "تعذّر الاتصال بالخادم", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl">
        {/* Profile Header */}
        <div
          className="rounded-2xl p-6 mb-6 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${theme.gradientFrom} 0%, rgba(244,246,255,0.8) 100%)` }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold flex-shrink-0"
              style={{ background: theme.primaryLight, color: theme.primary }}
            >
              {user?.fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground">{user?.fullName}</h1>
              <p className="text-sm text-muted-foreground font-mono ltr">{user?.studentId}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ background: theme.primaryLight, color: theme.primary }}
                >
                  {theme.labelAr}
                </span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    isPaid ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isPaid ? "عضوية مدفوعة" : "عضوية مجانية"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card border border-card-border rounded-xl p-4 text-center">
            <Star className="w-5 h-5 fill-current text-primary mx-auto mb-1.5" />
            <p className="text-xl font-bold text-primary">{user?.starsBalance}</p>
            <p className="text-xs text-muted-foreground mt-0.5">نجمة</p>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-4 text-center">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-1.5" />
            <p className="text-xl font-bold text-foreground">
              {rankData ? `${rankData.rank}/${rankData.total}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">ترتيبك</p>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span>معلومات الطالب</span>
          </h2>
          <div className="space-y-3">
            {[
              { label: "رقم الطالب", value: user?.studentId, ltr: true },
              { label: "الاسم الكامل", value: user?.fullName },
              { label: "رقم الهاتف", value: user?.phone, ltr: true },
              { label: "المرحلة الدراسية", value: theme.labelAr },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className={`text-sm font-medium text-foreground ${item.ltr ? "ltr" : ""}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Access Info */}
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span>صلاحية الوصول</span>
          </h2>
          <div className={`flex items-center gap-3 p-3 rounded-xl ${isPaid ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50 border border-border"}`}>
            <div className={`w-3 h-3 rounded-full ${isPaid ? "bg-green-400" : "bg-muted-foreground"}`} />
            <div>
              <p className={`text-sm font-semibold ${isPaid ? "text-green-400" : "text-foreground"}`}>
                {isPaid ? "عضوية مدفوعة نشطة" : "عضوية مجانية"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPaid
                  ? "تستطيع الوصول لجميع الدروس والاختبارات"
                  : "تواصل مع المعلم لترقية حسابك والوصول لجميع المحتوى"}
              </p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-card-border rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span>تغيير كلمة المرور</span>
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">كلمة المرور الحالية</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  data-testid="input-current-password"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="6 أحرف على الأقل"
                  required
                  className="w-full px-4 py-2.5 pr-10 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  data-testid="input-new-password"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">تأكيد كلمة المرور الجديدة</label>
              <div className="relative">
                <input
                  type="password"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="••••••"
                  required
                  className="w-full px-4 py-2.5 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                  data-testid="input-confirm-password"
                />
                {pwForm.confirmPassword && pwForm.newPassword === pwForm.confirmPassword && (
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={pwLoading || !pwForm.currentPassword || !pwForm.newPassword || !pwForm.confirmPassword}
              className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
              data-testid="btn-change-password"
            >
              {pwLoading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>جاري التحديث...</span></> : <><Lock className="w-4 h-4" /><span>تغيير كلمة المرور</span></>}
            </button>
          </form>
        </div>

        {/* Push Notifications */}
        {isSupported && (
          <div className="bg-card border border-card-border rounded-2xl p-5">
            <h2 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span>الإشعارات الفورية</span>
            </h2>
            {permission === "denied" ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                <BellOff className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">تم حظر الإشعارات. يمكنك تفعيلها من إعدادات المتصفح.</p>
              </div>
            ) : isSubscribed ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-sm font-semibold text-green-400">الإشعارات مفعّلة</p>
                    <p className="text-xs text-muted-foreground">ستتلقى إشعارات فورية من المعلم</p>
                  </div>
                </div>
                <button
                  onClick={unsubscribe}
                  disabled={pushLoading}
                  className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs hover:bg-muted/80 disabled:opacity-50 flex items-center gap-1"
                  data-testid="btn-unsubscribe-push"
                >
                  {pushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
                  <span>إلغاء</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
                <div className="flex items-center gap-3">
                  <BellOff className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">الإشعارات معطّلة</p>
                    <p className="text-xs text-muted-foreground">فعّل الإشعارات لتلقي تنبيهات الدروس والاختبارات</p>
                  </div>
                </div>
                <button
                  onClick={subscribe}
                  disabled={pushLoading}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
                  data-testid="btn-subscribe-push"
                >
                  {pushLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                  <span>تفعيل</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
