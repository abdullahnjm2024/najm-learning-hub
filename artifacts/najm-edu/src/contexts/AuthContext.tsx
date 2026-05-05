import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface User {
  id: number;
  studentId: string;
  email: string;
  fullName: string;
  phone: string;
  gradeLevel: string;
  accessRole: string;
  starsBalance: number;
  paidSubjectIds: number[];
  isSuspended?: boolean;
  suspensionReason?: string | null;
  receivedLeaderboardBonus?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isAdmin: boolean;
  isPaid: boolean;
  isPaidForSubject: (subjectId: number) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("najm_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem("najm_token");
      setToken(null);
      setLocalUser(null);
    }
  }, [isError]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("najm_token", newToken);
    setToken(newToken);
    setLocalUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("najm_token");
    setToken(null);
    setLocalUser(null);
    queryClient.clear();
  }, [queryClient]);

  // Prefer meData (always fresh from DB) over localUser (from login response)
  // Fall back to localUser during the brief window before meData loads
  const user = useMemo<User | null>(() => {
    if (meData) return meData as User;
    if (localUser) return localUser;
    return null;
  }, [localUser, meData]);

  const isPaidForSubject = useCallback((subjectId: number): boolean => {
    if (!user) return false;
    if (user.accessRole === "admin") return true;
    const ids: number[] = (user.paidSubjectIds ?? []).map(Number);
    return ids.includes(Number(subjectId));
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading: !!token && isLoading,
      login,
      logout,
      isAdmin: user?.accessRole === "admin",
      isPaid: user?.accessRole === "paid" || user?.accessRole === "admin",
      isPaidForSubject,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
