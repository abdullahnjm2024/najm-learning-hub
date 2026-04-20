import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/utils";

const STAFF_TOKEN_KEY = "najm_staff_token";

export type StaffRole = "teacher" | "supervisor" | "super_admin";

export interface StaffUser {
  id: number;
  adminId: string;
  fullName: string;
  role: StaffRole;
  assignedTracks: string[];
  assignedSubjectIds: number[];
  isActive: boolean;
}

interface StaffAuthContextType {
  staff: StaffUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, staff: StaffUser) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  isTeacher: boolean;
  isSupervisor: boolean;
}

const StaffAuthContext = createContext<StaffAuthContextType | null>(null);

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STAFF_TOKEN_KEY));
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !!localStorage.getItem(STAFF_TOKEN_KEY));

  // Restore staff session from stored token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STAFF_TOKEN_KEY);
    if (!storedToken) {
      setIsLoading(false);
      return;
    }
    const BASE = getApiBaseUrl();
    fetch(`${BASE}/staff/auth/me`, {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data: StaffUser) => {
        setStaff(data);
      })
      .catch(() => {
        localStorage.removeItem(STAFF_TOKEN_KEY);
        setToken(null);
        setStaff(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback((newToken: string, newStaff: StaffUser) => {
    localStorage.setItem(STAFF_TOKEN_KEY, newToken);
    setToken(newToken);
    setStaff(newStaff);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STAFF_TOKEN_KEY);
    setToken(null);
    setStaff(null);
  }, []);

  const value = useMemo<StaffAuthContextType>(() => ({
    staff,
    token,
    isLoading,
    login,
    logout,
    isSuperAdmin: staff?.role === "super_admin",
    isTeacher: staff?.role === "teacher",
    isSupervisor: staff?.role === "supervisor",
  }), [staff, token, isLoading, login, logout]);

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error("useStaffAuth must be used inside StaffAuthProvider");
  return ctx;
}

export function getStaffToken() {
  return localStorage.getItem(STAFF_TOKEN_KEY) || "";
}

export async function fetchWithStaffAuth(url: string, options: RequestInit = {}) {
  const BASE = getApiBaseUrl();
  return fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getStaffToken()}`,
      ...options.headers,
    },
  });
}
