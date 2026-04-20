import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { useListNotifications, useMarkNotificationRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, FileText, Megaphone, Star, Loader2 } from "lucide-react";

const TYPE_CONFIG: Record<string, { labelAr: string; icon: typeof Bell; color: string }> = {
  new_lesson: { labelAr: "درس جديد", icon: BookOpen, color: "#3B82F6" },
  new_exam: { labelAr: "اختبار جديد", icon: FileText, color: "#8B5CF6" },
  announcement: { labelAr: "إعلان", icon: Megaphone, color: "#F59E0B" },
  stars_update: { labelAr: "تحديث النجوم", icon: Star, color: "#10B981" },
};

export default function Notifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey(), enabled: !!user, retry: false }
  });
  const markRead = useMarkNotificationRead();

  const notifList = Array.isArray(notifications) ? notifications : [];

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    });
  };

  return (
    <Layout>
      <div className="mb-6">
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
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifList.map((notif: any) => {
            const typeCfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.announcement;
            const Icon = typeCfg.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-3 bg-card border border-card-border rounded-xl p-4 transition-all cursor-pointer hover:border-primary/40 ${
                  !notif.isRead ? "border-l-2 border-l-primary" : ""
                }`}
                onClick={() => !notif.isRead && handleMarkRead(notif.id)}
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
                      {!notif.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{notif.bodyAr}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${typeCfg.color}15`, color: typeCfg.color }}
                    >
                      {typeCfg.labelAr}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notif.createdAt).toLocaleDateString("ar")}
                    </span>
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
