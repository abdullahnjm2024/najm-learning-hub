import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { getApiBaseUrl } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Pencil, Trash2, Star, Phone, Video, AlignLeft, Gift, Loader2, X, Check, Share2 } from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok } from "react-icons/fa";

const tok = () => localStorage.getItem("najm_token") || localStorage.getItem("najm_staff_token") || "";
const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tok()}` });

interface Prize {
  id: number;
  nameAr: string;
  name: string;
  imageUrl: string | null;
  icon: string | null;
  requiredStars: number;
  orderIndex: number;
}

interface PrizeForm {
  nameAr: string;
  name: string;
  imageUrl: string;
  icon: string;
  requiredStars: number;
  orderIndex: number;
}

const EMPTY_PRIZE: PrizeForm = { nameAr: "", name: "", imageUrl: "", icon: "", requiredStars: 0, orderIndex: 0 };

export default function AdminSiteSettings() {
  const { toast } = useToast();
  const BASE = getApiBaseUrl();

  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_phone: "",
    about_text: "",
    intro_video_url: "",
    facebook_url: "",
    instagram_url: "",
    youtube_url: "",
    tiktok_url: "",
  });
  const [settingsSaving, setSettingsSaving] = useState<Record<string, boolean>>({});

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [prizeLoading, setPrizeLoading] = useState(false);
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);
  const [prizeForm, setPrizeForm] = useState<PrizeForm>(EMPTY_PRIZE);
  const [prizeSubmitting, setPrizeSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/site-settings`).then(r => r.json()).then(setSettings).catch(() => {});
    loadPrizes();
  }, [BASE]);

  const loadPrizes = () => {
    setPrizeLoading(true);
    fetch(`${BASE}/prizes`).then(r => r.json()).then(setPrizes).catch(() => {}).finally(() => setPrizeLoading(false));
  };

  const saveSetting = async (key: string) => {
    setSettingsSaving(s => ({ ...s, [key]: true }));
    try {
      await fetch(`${BASE}/site-settings/${key}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ value: settings[key] }),
      });
      toast({ title: "تم الحفظ", description: "تم تحديث الإعداد بنجاح" });
    } catch {
      toast({ title: "خطأ", description: "فشل الحفظ، حاول مجدداً", variant: "destructive" });
    } finally {
      setSettingsSaving(s => ({ ...s, [key]: false }));
    }
  };

  const openNewPrize = () => {
    setEditingPrize(null);
    setPrizeForm(EMPTY_PRIZE);
    setShowPrizeForm(true);
  };

  const openEditPrize = (prize: Prize) => {
    setEditingPrize(prize);
    setPrizeForm({
      nameAr: prize.nameAr,
      name: prize.name,
      imageUrl: prize.imageUrl || "",
      icon: prize.icon || "",
      requiredStars: prize.requiredStars,
      orderIndex: prize.orderIndex,
    });
    setShowPrizeForm(true);
  };

  const submitPrize = async () => {
    if (!prizeForm.nameAr.trim()) {
      toast({ title: "خطأ", description: "اسم الجائزة مطلوب", variant: "destructive" });
      return;
    }
    setPrizeSubmitting(true);
    const body = {
      nameAr: prizeForm.nameAr,
      name: prizeForm.name || prizeForm.nameAr,
      imageUrl: prizeForm.imageUrl || null,
      icon: prizeForm.icon || null,
      requiredStars: prizeForm.requiredStars,
      orderIndex: prizeForm.orderIndex,
    };
    try {
      if (editingPrize) {
        await fetch(`${BASE}/prizes/${editingPrize.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
        toast({ title: "تم التحديث", description: "تم تحديث الجائزة بنجاح" });
      } else {
        await fetch(`${BASE}/prizes`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
        toast({ title: "تم الإضافة", description: "تمت إضافة الجائزة بنجاح" });
      }
      setShowPrizeForm(false);
      loadPrizes();
    } catch {
      toast({ title: "خطأ", description: "فشلت العملية، حاول مجدداً", variant: "destructive" });
    } finally {
      setPrizeSubmitting(false);
    }
  };

  const deletePrize = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه الجائزة؟")) return;
    await fetch(`${BASE}/prizes/${id}`, { method: "DELETE", headers: authHeaders() });
    toast({ title: "تم الحذف", description: "تم حذف الجائزة" });
    loadPrizes();
  };

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
            إعدادات الموقع
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة محتوى الصفحة الرئيسية والجوائز</p>
        </div>

        {/* === General Settings === */}
        <section className="bg-card rounded-2xl p-6 shadow-tonal-sm" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
          <h2 className="font-bold text-base text-foreground mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <AlignLeft className="w-4 h-4 text-blue-600" />
            </div>
            الإعدادات العامة
          </h2>

          <div className="space-y-5">
            {/* WhatsApp */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-green-600" />
                رقم واتساب الدعم
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={settings.whatsapp_phone || ""}
                  onChange={e => setSettings(s => ({ ...s, whatsapp_phone: e.target.value }))}
                  placeholder="967738380741"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
                <button
                  onClick={() => saveSetting("whatsapp_phone")}
                  disabled={settingsSaving.whatsapp_phone}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                  style={{ background: "#22C55E" }}
                >
                  {settingsSaving.whatsapp_phone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">أدخل رقم الهاتف بالصيغة الدولية بدون +</p>
            </div>

            {/* About Text */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5 text-blue-600" />
                نص "من نحن"
              </label>
              <textarea
                rows={5}
                value={settings.about_text || ""}
                onChange={e => setSettings(s => ({ ...s, about_text: e.target.value }))}
                placeholder="أكتب هنا قصة وأهداف المنصة..."
                className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
              />
              <button
                onClick={() => saveSetting("about_text")}
                disabled={settingsSaving.about_text}
                className="mt-2 px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                style={{ background: "#0057bd" }}
              >
                {settingsSaving.about_text ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ النص
              </button>
            </div>

            {/* Intro Video URL */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-500" />
                رابط الفيديو التعريفي (يوتيوب)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  dir="ltr"
                  value={settings.intro_video_url || ""}
                  onChange={e => setSettings(s => ({ ...s, intro_video_url: e.target.value }))}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
                <button
                  onClick={() => saveSetting("intro_video_url")}
                  disabled={settingsSaving.intro_video_url}
                  className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                  style={{ background: "#EF4444" }}
                >
                  {settingsSaving.intro_video_url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">يقبل روابط يوتيوب العادية (watch, youtu.be, shorts)</p>
            </div>
          </div>
        </section>

        {/* === Social Media Links === */}
        <section className="bg-card rounded-2xl p-6 shadow-tonal-sm" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
          <h2 className="font-bold text-base text-foreground mb-5 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(0,87,189,0.08)" }}>
              <Share2 className="w-4 h-4 text-blue-600" />
            </div>
            روابط صفحاتنا (التواصل الاجتماعي)
          </h2>
          <div className="space-y-4">
            {[
              { key: "facebook_url",  Icon: FaFacebook,  label: "فيسبوك",   color: "#1877F2", placeholder: "https://facebook.com/yourpage" },
              { key: "instagram_url", Icon: FaInstagram, label: "إنستغرام", color: "#E1306C", placeholder: "https://instagram.com/yourpage" },
              { key: "youtube_url",   Icon: FaYoutube,   label: "يوتيوب",   color: "#FF0000", placeholder: "https://youtube.com/@yourchannel" },
              { key: "tiktok_url",    Icon: FaTiktok,    label: "تيك توك",  color: "#010101", placeholder: "https://tiktok.com/@youraccount" },
            ].map(({ key, Icon, label, color, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Icon style={{ color, width: 14, height: 14 }} />
                  رابط {label}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    value={settings[key] || ""}
                    onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                  />
                  <button
                    onClick={() => saveSetting(key)}
                    disabled={settingsSaving[key]}
                    className="px-4 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
                    style={{ background: color }}
                  >
                    {settingsSaving[key] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    حفظ
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === Prizes Manager === */}
        <section className="bg-card rounded-2xl p-6 shadow-tonal-sm" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(147,51,234,0.1)" }}>
                <Gift className="w-4 h-4 text-purple-600" />
              </div>
              إدارة الجوائز
            </h2>
            <button
              onClick={openNewPrize}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold flex items-center gap-1.5 hover:opacity-90 transition"
              style={{ background: "#9333EA" }}
            >
              <Plus className="w-4 h-4" />
              إضافة جائزة
            </button>
          </div>

          {prizeLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : prizes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد جوائز بعد. أضف أول جائزة!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prizes.map(prize => (
                <div
                  key={prize.id}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{ background: "rgba(147,51,234,0.04)", border: "1px solid rgba(147,51,234,0.12)" }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: "rgba(147,51,234,0.1)" }}>
                    {prize.icon || (prize.imageUrl ? (
                      <img src={prize.imageUrl} alt={prize.nameAr} className="w-10 h-10 object-contain rounded-lg" />
                    ) : "🏆")}
                  </div>
                  <div className="flex-1 min-w-0 text-right">
                    <p className="font-bold text-foreground text-sm">{prize.nameAr}</p>
                    {prize.name && prize.name !== prize.nameAr && (
                      <p className="text-xs text-muted-foreground ltr">{prize.name}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span className="text-xs font-semibold text-muted-foreground">{prize.requiredStars.toLocaleString("ar-EG")} نجمة</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openEditPrize(prize)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition"
                      style={{ color: "#0057bd" }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deletePrize(prize.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-background transition text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* === Prize Modal === */}
      {showPrizeForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(33,47,67,0.5)", backdropFilter: "blur(6px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowPrizeForm(false); }}
        >
          <div className="bg-card rounded-2xl shadow-tonal w-full max-w-md p-6" style={{ border: "1px solid rgba(160,174,198,0.2)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground">
                {editingPrize ? "تعديل الجائزة" : "إضافة جائزة جديدة"}
              </h3>
              <button onClick={() => setShowPrizeForm(false)} className="p-1 rounded-lg text-muted-foreground hover:bg-background transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">اسم الجائزة (عربي) *</label>
                <input
                  type="text"
                  value={prizeForm.nameAr}
                  onChange={e => setPrizeForm(f => ({ ...f, nameAr: e.target.value }))}
                  placeholder="مثال: كتاب مميز"
                  className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">اسم الجائزة (إنجليزي / اختياري)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={prizeForm.name}
                  onChange={e => setPrizeForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Premium Book"
                  className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">رمز تعبيري (Icon)</label>
                  <input
                    type="text"
                    value={prizeForm.icon}
                    onChange={e => setPrizeForm(f => ({ ...f, icon: e.target.value }))}
                    placeholder="🏆 أو 📚"
                    className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">النجوم المطلوبة *</label>
                  <input
                    type="number"
                    min={0}
                    value={prizeForm.requiredStars}
                    onChange={e => setPrizeForm(f => ({ ...f, requiredStars: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">رابط الصورة (اختياري)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={prizeForm.imageUrl}
                  onChange={e => setPrizeForm(f => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="https://example.com/prize.png"
                  className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">ترتيب العرض</label>
                <input
                  type="number"
                  min={0}
                  value={prizeForm.orderIndex}
                  onChange={e => setPrizeForm(f => ({ ...f, orderIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={submitPrize}
                disabled={prizeSubmitting}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition"
                style={{ background: "#9333EA" }}
              >
                {prizeSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingPrize ? "تحديث" : "إضافة"}
              </button>
              <button
                onClick={() => setShowPrizeForm(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-foreground hover:bg-background transition"
                style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
