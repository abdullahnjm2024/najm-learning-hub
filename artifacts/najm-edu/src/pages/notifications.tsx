import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Bell, BookOpen, FileText, Megaphone, Star, Loader2, MessageSquare, ExternalLink } from "lucide-react";

const TYPE_CONFIG: Record<string, { labelAr: string; icon: typeof Bell; color: string }> = {
  new_lesson:   { labelAr: "درس جديد",       icon: BookOpen,       color: "#3B82F6" },
  new_exam:     { labelAr: "اختبار جديد",     icon: FileText,       color: "#8B5CF6" },
  announcement: { labelAr: "إعلان",           icon: Megaphone,      color: "#F59E0B" },
  stars_update: { labelAr: "تحديث النجوم",    icon: Star,           color: "#10B981" },
};

const SUBMISSION_TITLES = ["استفسار جديد", "رد جديد من الأستاذ"];

export default function Notifications() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey(), enabled: !!user, retry: false }
  });
  const markRead = useMarkNotificationRead();

  const notifList = Array.isArray(notifications) ? notifications : [];

  const handleClick = (notif: any) => {
    if (!notif.isRead) {
      markRead.mutate({ id: notif.id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
      });
    }
    if (notif.link) {
      if (notif.link.startsWith("http")) {
        window.open(notif.link, "_blank", "noopener");
      } else {
        navigate(notif.link);
      }
    }
  };

  return (
    <Layout>
      <div className="mb-6" dir="rtl">
        <h1 className="text-xl font-bold text-foreground">الإشعارات</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {notifList.filter((n: any) => !n.isRead).length} غير مقروء
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : notifList.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground" dir="rtl">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2" dir="rtl">
          {notifList.map((notif: any) => {
            const isSubmissionRelated = SUBMISSION_TITLES.some(t => notif.titleAr?.includes(t));
            const typeCfg = isSubmissionRelated
              ? { labelAr: "واجبات واستفسارات", icon: MessageSquare, color: "#6366F1" }
              : (TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement);
            const Icon = typeCfg.icon;
            const isClickable = !!notif.link;

            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 bg-card border border-card-border rounded-xl p-4 transition-all ${
                  isClickable ? "cursor-pointer hover:border-primary/40 hover:shadow-sm" : !notif.isRead ? "cursor-pointer" : ""
                } ${!notif.isRead ? "border-l-4" : ""}`}
                style={!notif.isRead ? { borderLeftColor: typeCfg.color } : {}}
                onClick={() => handleClick(notif)}
                data-testid={`notification-${notif.id}`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${typeCfg.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: typeCfg.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-foreground text-sm">{notif.titleAr}</p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isClickable && (
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                      )}
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: typeCfg.color }} />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.bodyAr}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${typeCfg.color}15`, color: typeCfg.color }}
                    >
                      {typeCfg.labelAr}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleDateString("ar-SA", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                    {isClickable && (
                      <span className="text-xs font-medium" style={{ color: typeCfg.color }}>
                        اضغط للانتقال ←
                      </span>
                    )}
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
