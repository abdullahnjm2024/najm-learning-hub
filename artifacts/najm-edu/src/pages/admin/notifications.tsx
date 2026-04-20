import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useListNotifications, useCreateNotification, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GRADE_CONFIG } from "@/lib/utils";
import { Bell, Send, Loader2, X, Megaphone, BookOpen, FileText, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const notifSchema = z.object({
  titleAr: z.string().min(1, "العنوان مطلوب"),
  bodyAr: z.string().min(1, "المحتوى مطلوب"),
  type: z.enum(["announcement", "new_lesson", "new_exam", "stars_update"]),
  gradeLevel: z.enum(["grade9", "grade12_sci", "grade12_lit", "english", "ielts", "steps1000", "all"]),
});

type NotifForm = z.infer<typeof notifSchema>;

const TYPE_OPTIONS = [
  { value: "announcement", labelAr: "إعلان", icon: Megaphone },
  { value: "new_lesson", labelAr: "درس جديد", icon: BookOpen },
  { value: "new_exam", labelAr: "اختبار جديد", icon: FileText },
  { value: "stars_update", labelAr: "تحديث النجوم", icon: Star },
];

export default function AdminNotifications() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!showForm) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowForm(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showForm]);

  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey(), retry: false }
  });
  const sendNotification = useCreateNotification();

  const form = useForm<NotifForm>({
    resolver: zodResolver(notifSchema),
    defaultValues: { titleAr: "", bodyAr: "", type: "announcement", gradeLevel: "all" },
  });

  const notifList = Array.isArray(notifications) ? notifications : [];

  const onSubmit = (data: NotifForm) => {
    const payload = {
      title: data.titleAr,
      titleAr: data.titleAr,
      body: data.bodyAr,
      bodyAr: data.bodyAr,
      type: data.type,
      ...(data.gradeLevel !== "all" ? { gradeLevel: data.gradeLevel } : {}),
    };
    sendNotification.mutate(
      { data: payload as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
          form.reset();
          setShowForm(false);
          toast({ title: "تم إرسال الإشعار بنجاح" });
        },
        onError: () => toast({ title: "خطأ", description: "فشل إرسال الإشعار", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">الإشعارات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{notifList.length} إشعار</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90"
          data-testid="btn-add-notification"
        >
          <Send className="w-4 h-4" />
          <span>إرسال إشعار</span>
        </button>
      </div>

      {/* Send Form Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") setShowForm(false); }}
          tabIndex={-1}
        >
          <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-foreground">إرسال إشعار جديد</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">عنوان الإشعار</label>
                <input {...form.register("titleAr")} placeholder="إشعار جديد..." className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="input-title" />
                {form.formState.errors.titleAr && <p className="text-destructive text-xs mt-1">{form.formState.errors.titleAr.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">نص الإشعار</label>
                <textarea {...form.register("bodyAr")} rows={3} placeholder="محتوى الإشعار..." className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" data-testid="input-body" />
                {form.formState.errors.bodyAr && <p className="text-destructive text-xs mt-1">{form.formState.errors.bodyAr.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">النوع</label>
                  <select {...form.register("type")} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="select-type">
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.labelAr}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الجمهور</label>
                  <select {...form.register("gradeLevel")} className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" data-testid="select-grade">
                    <option value="all">الجميع</option>
                    {Object.entries(GRADE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.labelAr}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-muted text-muted-foreground rounded-lg text-sm hover:bg-muted/80">إلغاء</button>
                <button type="submit" disabled={sendNotification.isPending} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60" data-testid="btn-send">
                  {sendNotification.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /><span>إرسال</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>لا توجد إشعارات مرسلة بعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifList.map((notif: any) => {
            const typeCfg = TYPE_OPTIONS.find(t => t.value === notif.type) || TYPE_OPTIONS[0];
            const Icon = typeCfg.icon;
            return (
              <div key={notif.id} className="bg-card border border-card-border rounded-xl p-4" data-testid={`notif-row-${notif.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{notif.titleAr}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.bodyAr}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{typeCfg.labelAr}</span>
                      {notif.gradeLevel && (
                        <span className="text-xs text-muted-foreground">{GRADE_CONFIG[notif.gradeLevel]?.labelAr}</span>
                      )}
                      <span className="text-xs text-muted-foreground mr-auto">{new Date(notif.createdAt).toLocaleDateString("ar")}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
