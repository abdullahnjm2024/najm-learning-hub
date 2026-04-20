import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAuth } from "@/contexts/StaffAuthContext";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/lib/utils";
import { Loader2, Star, MessageCircle, Menu, X, ChevronDown } from "lucide-react";
import { FaFacebook, FaInstagram, FaYoutube, FaTiktok, FaWhatsapp } from "react-icons/fa";

const loginSchema = z.object({
  identifier: z.string().min(1, "الرجاء إدخال رقم الطالب"),
  password: z.string().min(1, "الرجاء إدخال كلمة المرور"),
});
type LoginForm = z.infer<typeof loginSchema>;

const SECTIONS = [
  { label: "الصف التاسع",      prefix: "G9-",    color: "#FBBF24", bg: "#FEF3C7", logo: "/images/logo-grade9.png",        desc: "تأسيس قوي وشامل للمرحلة الأساسية" },
  { label: "بكالوريا علمي",    prefix: "SCI-",   color: "#EF4444", bg: "#FEE2E2", logo: "/images/logo-baccalaureate.png", desc: "تحضير مكثف للفرع العلمي" },
  { label: "بكالوريا أدبي",    prefix: "LIT-",   color: "#F97066", bg: "#FFE8E5", logo: "/images/logo-baccalaureate.png", desc: "تحضير مكثف للفرع الأدبي" },
  { label: "اللغة الإنجليزية", prefix: "ENG-",   color: "#4285F4", bg: "#DBEAFE", logo: "/images/logo-outcomes.png",      desc: "أتقن الإنجليزية مع أفضل الأساتذة" },
  { label: "مشروع 1000 خطوة", prefix: "TSP-",   color: "#22C55E", bg: "#DCFCE7", logo: "/images/logo-steps1000.png",     desc: "رحلة تدريجية نحو الإتقان الكامل" },
  { label: "تحضير الآيلتس",   prefix: "IELTS-", color: "#9333EA", bg: "#EDE9FE", logo: "/images/logo-ielts.png",         desc: "اجتز الآيلتس بأعلى الدرجات" },
];

const STATS_CONFIG = [
  { id: "students", label: "طالب نشط",                              color: "#0057bd" },
  { id: "prep",     text: "تجهيز كامل للطالب من كل الجوانب",       color: "#15803D" },
  { id: "success",  value: "٩٨٪", label: "نسبة النجاح",            color: "#9333EA" },
  { id: "teacher",  text: "مع نخبة من أفضل المعلمين",              color: "#EF4444" },
] as const;

interface Prize {
  id: number;
  nameAr: string;
  name: string;
  imageUrl?: string | null;
  icon?: string | null;
  requiredStars: number;
}

function getYTEmbed(url: string): string {
  if (!url) return "";
  if (url.includes("youtube.com/embed/")) return url;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return `https://www.youtube.com/embed/${m[1]}`;
  }
  return url;
}

const NAV_LINKS = [
  { href: "#sections", label: "اختر مسارك التعليمي" },
  { href: "#about",    label: "من نحن" },
  { href: "#video",    label: "فيديو تعريفي" },
  { href: "#prizes",   label: "الجوائز" },
  { href: "#pages",    label: "صفحاتنا" },
];

const TRACK_OPTIONS = [
  { label: "الصف التاسع",           prefix: "G9-"    },
  { label: "بكالوريا علمي",         prefix: "SCI-"   },
  { label: "بكالوريا أدبي",         prefix: "LIT-"   },
  { label: "كورسات إنجليزي",        prefix: "ENG-"   },
  { label: "مشروع ألف خطوة",       prefix: "TSP-"   },
  { label: "تحضير آيلتس",          prefix: "IELTS-" },
  { label: "الإدارة (Administration)", prefix: "ADMIN-" },
];

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { login: staffLogin } = useStaffAuth();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const [showLogin, setShowLogin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedPrefix, setSelectedPrefix] = useState(TRACK_OPTIONS[0].prefix);
  const [studentNumber, setStudentNumber] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  const BASE = getApiBaseUrl();
  const isAdminMode = selectedPrefix === "ADMIN-";

  useEffect(() => {
    fetch(`${BASE}/stats`)
      .then(r => r.json())
      .then(d => { if (typeof d.totalStudents === "number") setStudentCount(d.totalStudents); })
      .catch(() => {});
    fetch(`${BASE}/site-settings`)
      .then(r => r.json()).then(setSiteSettings).catch(() => {});
    fetch(`${BASE}/prizes`)
      .then(r => r.json()).then(setPrizes).catch(() => {});
  }, [BASE]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const handlePrefixChange = (prefix: string) => {
    setSelectedPrefix(prefix);
    form.setValue("identifier", prefix + studentNumber, { shouldValidate: true });
  };

  const handleNumberChange = (num: string) => {
    setStudentNumber(num);
    form.setValue("identifier", selectedPrefix + num, { shouldValidate: true });
  };

  const openLoginWithPrefix = (prefix: string) => {
    setSelectedPrefix(prefix);
    setStudentNumber("");
    form.setValue("identifier", prefix);
    setShowLogin(true);
  };

  const onSubmit = async (data: LoginForm) => {
    if (isAdminMode) {
      setAdminLoading(true);
      try {
        const res = await fetch(`${BASE}/staff/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminId: data.identifier, password: data.password }),
        });
        const result = await res.json();
        if (!res.ok) {
          toast({ title: "خطأ في تسجيل الدخول", description: result.message || "الرقم الإداري أو كلمة المرور غير صحيحة", variant: "destructive" });
          return;
        }
        staffLogin(result.token, result.staff);
        toast({ title: "مرحباً بك!", description: `أهلاً ${result.staff.fullName}` });
        setLocation(result.staff.role === "teacher" ? "/teacher" : "/admin");
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ في الاتصال", variant: "destructive" });
      } finally {
        setAdminLoading(false);
      }
      return;
    }

    loginMutation.mutate(
      { data: { email: data.identifier, password: data.password } as any },
      {
        onSuccess: (res: any) => {
          login(res.token, res.user);
          toast({ title: "مرحباً بك!", description: `أهلاً ${res.user.fullName}` });
          setLocation(res.user.accessRole === "admin" ? "/admin" : "/");
        },
        onError: () => {
          toast({ title: "خطأ في تسجيل الدخول", description: "رقم الطالب أو كلمة المرور غير صحيحة", variant: "destructive" });
        },
      }
    );
  };

  const aboutText = siteSettings.about_text || "نظام نجم التعليمي هو منصة تعليمية متكاملة تأسست لتقديم تجربة تعليمية استثنائية للطلاب. نؤمن بأن كل طالب يستحق أفضل تعليم ممكن، لذا جمعنا نخبة من أفضل المعلمين والمتخصصين لمساعدتك في تحقيق أهدافك الأكاديمية والوصول إلى التفوق الذي تستحقه.";
  const introVideoUrl = siteSettings.intro_video_url || "";
  const whatsappPhone = siteSettings.whatsapp_phone || "967738380741";
  const embedUrl = getYTEmbed(introVideoUrl);

  const socialLinks = [
    { key: "facebook_url",  Icon: FaFacebook,  label: "فيسبوك",   color: "#1877F2", bg: "#EBF3FF" },
    { key: "instagram_url", Icon: FaInstagram, label: "إنستغرام", color: "#E1306C", bg: "#FFF0F5" },
    { key: "youtube_url",   Icon: FaYoutube,   label: "يوتيوب",   color: "#FF0000", bg: "#FFF0F0" },
    { key: "tiktok_url",    Icon: FaTiktok,    label: "تيك توك",  color: "#010101", bg: "#F0F0F0" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FF] text-[#212F43]" style={{ fontFamily: "'Manrope', 'IBM Plex Sans Arabic', sans-serif" }} dir="rtl">

      {/* ===== TOP NAV ===== */}
      <header
        className="fixed top-0 w-full z-50 flex items-center justify-between px-4 lg:px-10 py-3 shadow-sm shadow-slate-200/50"
        style={{ background: "rgba(244,246,255,0.92)", backdropFilter: "blur(16px)" }}
      >
        {/* Logo — rightmost in RTL */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src="/images/logo-main.png" alt="نجم" className="h-9 w-9 object-contain" />
          <span
            className="text-lg font-black hidden sm:block"
            style={{
              fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif",
              background: "linear-gradient(90deg, #FBBF24 0%, #EF4444 40%, #9333EA 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            نظام نجم التعليمي
          </span>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#4E5C71]">
          {NAV_LINKS.map(link => (
            <a key={link.href} href={link.href} className="hover:text-[#0057bd] transition-colors whitespace-nowrap">
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* WhatsApp contact button */}
          <a
            href={`https://wa.me/${whatsappPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-bold text-white hover:opacity-90 transition-all"
            style={{ background: "#25D366" }}
            title="تواصل معنا على واتساب"
          >
            <FaWhatsapp className="w-4 h-4" />
            <span className="hidden md:inline">تواصل معنا</span>
          </a>

          {/* Login button */}
          <button
            onClick={() => setShowLogin(true)}
            className="px-4 py-2 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all active:scale-95"
            style={{ background: "#0057bd" }}
            data-testid="button-open-login"
          >
            تسجيل الدخول
          </button>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition"
            onClick={() => setMobileMenuOpen(o => !o)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-[#212F43]" /> : <Menu className="w-5 h-5 text-[#212F43]" />}
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-[56px] right-0 left-0 shadow-xl py-4 px-6 space-y-1"
            style={{ background: "rgba(244,246,255,0.98)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(160,174,198,0.2)" }}
            onClick={e => e.stopPropagation()}
          >
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="block py-2.5 text-sm font-medium text-[#4E5C71] hover:text-[#0057bd] border-b border-slate-100 last:border-0"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-2.5 text-sm font-bold"
              style={{ color: "#25D366" }}
              onClick={() => setMobileMenuOpen(false)}
            >
              <FaWhatsapp className="w-4 h-4" />
              تواصل معنا على واتساب
            </a>
          </div>
        </div>
      )}

      {/* ===== HERO ===== */}
      <section
        className="min-h-screen flex items-center pt-16 overflow-hidden"
        style={{ background: "linear-gradient(155deg, rgba(0,87,189,0.05) 0%, #F4F6FF 60%)" }}
      >
        <div className="container mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-right order-2 lg:order-1">
            <span
              className="inline-block px-4 py-1.5 mb-6 rounded-full text-sm font-bold"
              style={{ background: "rgba(0,87,189,0.1)", color: "#0057bd" }}
            >
              مستقبلك يبدأ هنا
            </span>
            <h1
              className="text-4xl lg:text-6xl font-extrabold leading-tight mb-6 text-[#212F43]"
              style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
            >
              رحلتك نحو <span style={{ color: "#0057bd" }}>التفوق</span> تبدأ من هنا
            </h1>
            <p className="text-lg text-[#4E5C71] mb-10 leading-relaxed max-w-lg">
              نظام نجم التعليمي يوفر لك الأدوات والمناهج المتطورة لتحقيق أهدافك الأكاديمية بأسلوب تفاعلي حديث وممتع.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowLogin(true)}
                className="px-8 py-4 rounded-full text-lg font-bold text-white shadow-lg hover:shadow-xl hover:translate-y-[-2px] transition-all active:scale-95"
                style={{ background: "#0057bd" }}
                data-testid="button-start"
              >
                ابدأ رحلتك الآن
              </button>
              <a
                href="#sections"
                className="px-8 py-4 rounded-full text-lg font-bold text-[#212F43] hover:bg-[#EBF1FF] transition-all"
                style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
              >
                اكتشف المناهج
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center order-1 lg:order-2 animate-star-pulse">
            <img
              src="/images/logo-main.png"
              alt="نظام نجم التعليمي"
              className="w-full max-w-xs lg:max-w-sm h-auto object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ===== TRACK CARDS (compact grid) ===== */}
      <section id="sections" className="py-16 bg-[#F4F6FF]">
        <div className="container mx-auto px-4 lg:px-10">
          <div className="text-center mb-10">
            <h2
              className="text-3xl lg:text-4xl font-black mb-3 text-[#212F43]"
              style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
            >
              اختر مسارك التعليمي
            </h2>
            <div className="w-16 h-1.5 rounded-full mx-auto" style={{ background: "#0057bd" }} />
          </div>

          {/* 2 per row on mobile → 3 on md → 6 on lg (all in one row) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            {SECTIONS.map((sec) => (
              <div
                key={sec.label}
                className="group relative rounded-2xl bg-white cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all"
                style={{ border: "1px solid rgba(160,174,198,0.18)", padding: "14px 12px 12px" }}
                onClick={() => openLoginWithPrefix(sec.prefix)}
              >
                {/* Logo */}
                <div
                  className="rounded-xl flex items-center justify-center mb-3 mx-auto group-hover:scale-105 transition-transform overflow-hidden"
                  style={{ background: sec.bg, width: "100%", aspectRatio: "1/1" }}
                >
                  <img src={sec.logo} alt={sec.label} className="h-16 w-auto object-contain" />
                </div>

                {/* Title */}
                <h3 className="text-xs font-bold text-center text-[#212F43] mb-1 leading-snug">{sec.label}</h3>

                {/* Prefix badge */}
                <div className="flex justify-center">
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ltr"
                    style={{ background: `${sec.color}18`, color: sec.color }}
                  >
                    {sec.prefix}
                  </span>
                </div>

                {/* Color bar */}
                <div className="h-0.5 w-full rounded-full mt-2" style={{ background: sec.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section id="stats" className="py-16 bg-[#EBF1FF]" style={{ borderTop: "1px solid rgba(160,174,198,0.15)", borderBottom: "1px solid rgba(160,174,198,0.15)" }}>
        <div className="container mx-auto px-6 lg:px-10 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS_CONFIG.map((s) => {
            if (s.id === "students") {
              const display = studentCount !== null ? studentCount.toLocaleString("ar-EG") : "…";
              return (
                <div key={s.id}>
                  <div className="text-4xl font-black mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color }}>{display}</div>
                  <div className="text-[#4E5C71] font-medium">{"label" in s ? s.label : ""}</div>
                </div>
              );
            }
            if ("value" in s) {
              return (
                <div key={s.id}>
                  <div className="text-4xl font-black mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: s.color }}>{s.value}</div>
                  <div className="text-[#4E5C71] font-medium">{"label" in s ? s.label : ""}</div>
                </div>
              );
            }
            return (
              <div key={s.id} className="flex items-center justify-center">
                <p className="text-base font-bold leading-snug" style={{ color: s.color }}>{"text" in s ? s.text : ""}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== ABOUT US ===== */}
      <section id="about" className="py-24 bg-white">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-bold" style={{ background: "rgba(0,87,189,0.08)", color: "#0057bd" }}>
                من نحن
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-[#212F43]" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
                قصتنا ورسالتنا
              </h2>
              <div className="w-16 h-1.5 rounded-full mx-auto mt-4" style={{ background: "#0057bd" }} />
            </div>
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-5">
                <p className="text-[#4E5C71] text-lg leading-relaxed text-right">
                  {aboutText}
                </p>
                <div className="flex gap-6 pt-2">
                  <div className="text-center">
                    <div className="text-3xl font-black text-[#0057bd]">٦</div>
                    <div className="text-sm text-[#4E5C71]">مسارات تعليمية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black" style={{ color: "#22C55E" }}>٩٨٪</div>
                    <div className="text-sm text-[#4E5C71]">نسبة النجاح</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-black" style={{ color: "#9333EA" }}>{studentCount !== null ? studentCount.toLocaleString("ar-EG") : "…"}</div>
                    <div className="text-sm text-[#4E5C71]">طالب معنا</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: "⭐", title: "تعليم متميز", desc: "مناهج متطورة تواكب أحدث الأساليب التعليمية" },
                  { icon: "🎯", title: "متابعة مستمرة", desc: "تتبع تقدمك أولاً بأول مع إحصائيات دقيقة" },
                  { icon: "🏆", title: "جوائز ومكافآت", desc: "نظام نقاط وجوائز لتحفيزك على الاستمرار" },
                  { icon: "💬", title: "دعم متواصل", desc: "فريق دعم جاهز للإجابة على كل تساؤلاتك" },
                ].map(item => (
                  <div key={item.title} className="p-4 rounded-2xl card-3d bg-[#F4F6FF]" style={{ border: "1px solid rgba(160,174,198,0.15)" }}>
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="font-bold text-[#212F43] text-sm mb-1">{item.title}</div>
                    <div className="text-xs text-[#4E5C71] leading-relaxed">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== INTRO VIDEO ===== */}
      {embedUrl && (
        <section id="video" className="py-24" style={{ background: "linear-gradient(135deg, rgba(0,87,189,0.06) 0%, #F4F6FF 100%)" }}>
          <div className="container mx-auto px-6 lg:px-10">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-bold" style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444" }}>
                فيديو تعريفي
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-[#212F43]" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
                تعرّف على نظام نجم
              </h2>
              <div className="w-16 h-1.5 rounded-full mx-auto mt-4" style={{ background: "#EF4444" }} />
            </div>
            <div className="max-w-3xl mx-auto">
              <div
                className="relative rounded-3xl overflow-hidden shadow-tonal"
                style={{ aspectRatio: "16/9", border: "1px solid rgba(160,174,198,0.2)" }}
              >
                <iframe
                  src={embedUrl}
                  title="فيديو تعريفي - نظام نجم التعليمي"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== PRIZES ===== */}
      {prizes.length > 0 && (
        <section id="prizes" className="py-24 bg-[#F4F6FF]">
          <div className="container mx-auto px-6 lg:px-10">
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-bold" style={{ background: "rgba(147,51,234,0.08)", color: "#9333EA" }}>
                الجوائز
              </span>
              <h2 className="text-3xl lg:text-4xl font-black text-[#212F43]" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
                اجمع النجوم واربح الجوائز
              </h2>
              <p className="text-[#4E5C71] mt-3">أكمل دروسك واجمع النجوم للفوز بجوائز حصرية</p>
              <div className="w-16 h-1.5 rounded-full mx-auto mt-4" style={{ background: "#9333EA" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {prizes.map(prize => (
                <div
                  key={prize.id}
                  className="bg-white rounded-2xl p-6 text-center card-3d"
                  style={{ border: "1px solid rgba(160,174,198,0.15)" }}
                >
                  <div className="w-full h-40 rounded-xl mb-4 flex items-center justify-center overflow-hidden"
                    style={{ background: "rgba(147,51,234,0.06)" }}>
                    {prize.imageUrl ? (
                      <img src={prize.imageUrl} alt={prize.nameAr} className="h-full w-full object-contain p-3" />
                    ) : (
                      <span className="text-6xl">{prize.icon || "🏆"}</span>
                    )}
                  </div>
                  <h3 className="font-bold text-[#212F43] mb-1">{prize.nameAr}</h3>
                  {prize.name && prize.name !== prize.nameAr && (
                    <p className="text-xs text-[#4E5C71] mb-2 ltr">{prize.name}</p>
                  )}
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <Star className="w-4 h-4 text-amber-400 fill-current" />
                    <span className="text-sm font-bold text-[#4E5C71]">{prize.requiredStars.toLocaleString("ar-EG")} نجمة</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== OUR PAGES (social media) ===== */}
      <section id="pages" className="py-24 bg-white">
        <div className="container mx-auto px-6 lg:px-10">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 mb-4 rounded-full text-sm font-bold" style={{ background: "rgba(0,87,189,0.08)", color: "#0057bd" }}>
              تابعنا
            </span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#212F43]" style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}>
              صفحاتنا
            </h2>
            <p className="text-[#4E5C71] mt-3 text-base">تابعنا على منصات التواصل الاجتماعي للحصول على آخر الأخبار والمحتوى التعليمي</p>
            <div className="w-16 h-1.5 rounded-full mx-auto mt-4" style={{ background: "#0057bd" }} />
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {socialLinks.map(({ key, Icon, label, color, bg }) => {
              const url = siteSettings[key];
              if (!url) return null;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 p-6 rounded-2xl hover:shadow-lg hover:-translate-y-1 transition-all w-36 card-3d"
                  style={{ background: bg, border: `1.5px solid ${color}22` }}
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm"
                    style={{ background: color }}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-sm font-bold" style={{ color }}>{label}</span>
                </a>
              );
            })}

            {/* Show placeholder cards if no social links configured */}
            {socialLinks.every(({ key }) => !siteSettings[key]) && (
              <div className="w-full text-center py-10">
                {socialLinks.map(({ Icon, label, color, bg }) => (
                  <div
                    key={label}
                    className="inline-flex flex-col items-center gap-3 p-6 rounded-2xl m-2 opacity-40 w-36"
                    style={{ background: bg, border: `1.5px solid ${color}22` }}
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: color }}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-sm font-bold" style={{ color }}>{label}</span>
                  </div>
                ))}
                <p className="text-[#4E5C71] text-sm mt-4 block">سيتم إضافة روابط التواصل الاجتماعي قريباً</p>
              </div>
            )}
          </div>

          {/* WhatsApp CTA */}
          <div className="text-center mt-10">
            <a
              href={`https://wa.me/${whatsappPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white hover:opacity-90 transition-all shadow-md hover:shadow-lg"
              style={{ background: "#25D366" }}
            >
              <FaWhatsapp className="w-5 h-5" />
              تواصل معنا على واتساب
            </a>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="bg-[#F4F6FF] py-8 px-6 lg:px-10 text-center text-sm text-[#4E5C71]" style={{ borderTop: "1px solid rgba(160,174,198,0.12)" }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <img src="/images/logo-main.png" alt="نجم" className="h-8 w-8 object-contain" />
          <span className="font-bold text-[#212F43]">نظام نجم التعليمي</span>
        </div>
        <p>© 2024 نظام نجم التعليمي. جميع الحقوق محفوظة.</p>
      </footer>

      {/* ===== LOGIN MODAL ===== */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(33,47,67,0.5)", backdropFilter: "blur(6px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}
        >
          <div className="relative bg-white rounded-3xl shadow-tonal w-full max-w-sm p-8" style={{ border: "1px solid rgba(160,174,198,0.2)" }}>
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 left-4 p-1.5 rounded-lg text-[#4E5C71] hover:bg-[#F4F6FF] transition"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-7">
              <img src="/images/logo-main.png" alt="نجم" className="h-16 w-16 object-contain mx-auto mb-3 animate-star-pulse" />
              <h2
                className="text-2xl font-black text-[#212F43]"
                style={{ fontFamily: "'Plus Jakarta Sans', 'IBM Plex Sans Arabic', sans-serif" }}
              >
                نظام نجم التعليمي
              </h2>
              <p className="text-[#4E5C71] text-sm mt-1">سجّل دخولك وابدأ رحلة التفوق</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* hidden field keeps react-hook-form validation in sync */}
              <input type="hidden" {...form.register("identifier")} />

              <div>
                <label className="block text-sm font-semibold text-[#212F43] mb-2">
                  {isAdminMode ? "الرقم الإداري" : "رقم الطالب"}
                </label>

                {/* Track dropdown */}
                <div className="relative mb-2">
                  <select
                    value={selectedPrefix}
                    onChange={e => handlePrefixChange(e.target.value)}
                    className="w-full pr-4 pl-9 py-3 rounded-xl text-sm text-[#212F43] focus:outline-none transition appearance-none cursor-pointer"
                    style={{
                      border: isAdminMode ? "1.5px solid rgba(251,191,36,0.6)" : "1.5px solid rgba(160,174,198,0.4)",
                      background: isAdminMode ? "#FFFBEB" : "#F4F6FF",
                    }}
                    data-testid="select-track"
                  >
                    {TRACK_OPTIONS.map(t => (
                      <option key={t.prefix} value={t.prefix}>{t.label}</option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: isAdminMode ? "#D97706" : "#4E5C71" }}
                  />
                </div>

                {/* Prefix badge + ID input */}
                <div
                  className="flex items-center gap-0 rounded-xl overflow-hidden"
                  style={{ border: isAdminMode ? "1.5px solid rgba(251,191,36,0.6)" : "1.5px solid rgba(160,174,198,0.4)" }}
                >
                  <span
                    className="px-3 py-3 text-sm font-bold select-none ltr flex-shrink-0 border-l border-slate-200"
                    style={{
                      background: isAdminMode ? "#FEF3C7" : "#EBF1FF",
                      color: isAdminMode ? "#D97706" : "#0057bd",
                    }}
                  >
                    {selectedPrefix}
                  </span>
                  <input
                    type="text"
                    inputMode={isAdminMode ? "text" : "numeric"}
                    placeholder={isAdminMode ? "000" : "1234"}
                    dir="ltr"
                    autoComplete="username"
                    value={studentNumber}
                    onChange={e => handleNumberChange(e.target.value)}
                    className="flex-1 px-3 py-3 text-sm text-[#212F43] bg-[#F4F6FF] placeholder:text-[#A0AEC6] focus:outline-none"
                    style={{ background: isAdminMode ? "#FFFBEB" : undefined }}
                    data-testid="input-student-number"
                  />
                </div>
                {form.formState.errors.identifier && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.identifier.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#212F43] mb-1.5">كلمة المرور</label>
                <input
                  {...form.register("password")}
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl text-sm text-[#212F43] bg-[#F4F6FF] placeholder:text-[#A0AEC6] focus:outline-none transition"
                  style={{ border: "1.5px solid rgba(160,174,198,0.4)" }}
                  data-testid="input-password"
                />
                {form.formState.errors.password && (
                  <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending || adminLoading}
                className="w-full py-3.5 rounded-xl text-base font-bold text-white shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all active:scale-95 flex items-center justify-center gap-2 mt-2"
                style={{ background: isAdminMode ? "#D97706" : "#0057bd" }}
                data-testid="button-login-submit"
              >
                {(loginMutation.isPending || adminLoading) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isAdminMode ? "دخول الإدارة" : "تسجيل الدخول"}
              </button>
            </form>

            {!isAdminMode && (
              <p className="text-center text-sm text-[#4E5C71] mt-4">
                ليس لديك حساب؟{" "}
                <a
                  href="https://docs.google.com/forms/d/1fu2yBrL4QkjLckmG29YWvvCOHCAij781Nsqkw0LkwlU/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold hover:underline"
                  style={{ color: "#0057bd" }}
                >
                  سجل الآن
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
