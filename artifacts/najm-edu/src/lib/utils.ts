import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return "";

  // Already a proper embed URL — return as-is
  if (url.includes("youtube.com/embed/")) {
    return url;
  }

  // Try each known YouTube URL pattern to extract the 11-char video ID
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,                  // watch?v=ID  or  &v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,             // youtu.be/ID
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,  // youtube.com/shorts/ID
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,       // youtube.com/v/ID
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,    // youtube.com/live/ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
  }

  // Not a recognized YouTube URL — return unchanged
  return url;
}

export function getGoogleFormEmbedUrl(url: string): string {
  if (!url) return "";
  if (url.includes("?embedded=true")) return url;
  if (url.includes("?")) return `${url}&embedded=true`;
  return `${url}?embedded=true`;
}

export function getApiBaseUrl(): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`.replace(/^\/\//, "/");
}

export interface GradeTheme {
  label: string;
  labelAr: string;
  primary: string;
  onPrimary: string;
  surface: string;
  surfaceLow: string;
  primaryLight: string;
  gradientFrom: string;
  logo: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  icon: string;
}

export const GRADE_CONFIG: Record<string, GradeTheme> = {
  grade9: {
    label: "Grade 9",
    labelAr: "الصف التاسع",
    primary: "#FBBF24",
    onPrimary: "#451a03",
    surface: "#FFFDF5",
    surfaceLow: "#fffbeb",
    primaryLight: "rgba(251,191,36,0.12)",
    gradientFrom: "rgba(251,191,36,0.08)",
    logo: "/images/logo-grade9.png",
    sidebarTitle: "نجم التاسع",
    sidebarSubtitle: "طريقك نحو التفوق",
    icon: "9",
  },
  grade12_sci: {
    label: "Grade 12 Science",
    labelAr: "بكالوريا علمي",
    primary: "#EF4444",
    onPrimary: "#FFFFFF",
    surface: "#FFF5F5",
    surfaceLow: "#FEE2E2",
    primaryLight: "rgba(239,68,68,0.12)",
    gradientFrom: "rgba(239,68,68,0.07)",
    logo: "/images/logo-baccalaureate.png",
    sidebarTitle: "نجم العلمي",
    sidebarSubtitle: "طريقك إلى البكالوريا العلمية",
    icon: "SCI",
  },
  grade12_lit: {
    label: "Grade 12 Literature",
    labelAr: "بكالوريا أدبي",
    primary: "#F97066",
    onPrimary: "#FFFFFF",
    surface: "#FFF6F5",
    surfaceLow: "#FFE8E5",
    primaryLight: "rgba(249,112,102,0.12)",
    gradientFrom: "rgba(249,112,102,0.07)",
    logo: "/images/logo-baccalaureate.png",
    sidebarTitle: "نجم الأدبي",
    sidebarSubtitle: "طريقك إلى البكالوريا الأدبية",
    icon: "LIT",
  },
  english: {
    label: "English",
    labelAr: "اللغة الإنجليزية",
    primary: "#4285F4",
    onPrimary: "#ffffff",
    surface: "#f4f6ff",
    surfaceLow: "#ebf1ff",
    primaryLight: "rgba(66,133,244,0.10)",
    gradientFrom: "rgba(66,133,244,0.06)",
    logo: "/images/logo-outcomes.png",
    sidebarTitle: "نجم الإنجليزي",
    sidebarSubtitle: "أتقن الإنجليزية مع نجم",
    icon: "EN",
  },
  steps1000: {
    label: "1000 Steps",
    labelAr: "مشروع 1000 خطوة",
    primary: "#22C55E",
    onPrimary: "#FFFFFF",
    surface: "#F0FDF4",
    surfaceLow: "#DCFCE7",
    primaryLight: "rgba(34,197,94,0.12)",
    gradientFrom: "rgba(34,197,94,0.07)",
    logo: "/images/logo-steps1000.png",
    sidebarTitle: "نجم ألف خطوة",
    sidebarSubtitle: "خطوتك الأولى نحو النجاح",
    icon: "1K",
  },
  ielts: {
    label: "IELTS",
    labelAr: "تحضير الآيلتس",
    primary: "#9333EA",
    onPrimary: "#ffffff",
    surface: "#f8f7ff",
    surfaceLow: "#f5f3ff",
    primaryLight: "rgba(147,51,234,0.10)",
    gradientFrom: "rgba(147,51,234,0.06)",
    logo: "/images/logo-ielts.png",
    sidebarTitle: "نجم IELTS",
    sidebarSubtitle: "بوابتك للجامعات العالمية",
    icon: "IE",
  },
};

export const ADMIN_THEME: GradeTheme = {
  label: "Admin",
  labelAr: "المدير العام",
  primary: "#0057bd",
  onPrimary: "#f0f2ff",
  surface: "#f4f6ff",
  surfaceLow: "#ebf1ff",
  primaryLight: "rgba(0,87,189,0.10)",
  gradientFrom: "rgba(0,87,189,0.06)",
  logo: "/images/logo-main.png",
  sidebarTitle: "نظام نجم",
  sidebarSubtitle: "لوحة التحكم",
  icon: "A",
};
