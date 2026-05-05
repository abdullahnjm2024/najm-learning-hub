import { ShieldX } from "lucide-react";

interface Props {
  reason: string;
  onClose: () => void;
}

export function SuspensionModal({ reason, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      dir="rtl"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">الحساب موقوف مؤقتاً</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{reason}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors"
          >
            حسناً، العودة
          </button>
        </div>
      </div>
    </div>
  );
}
