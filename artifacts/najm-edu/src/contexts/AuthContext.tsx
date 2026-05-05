import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/utils";
import { ShieldX, RefreshCw } from "lucide-react";

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

function SuspensionScreen({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6" dir="rtl">
      <div className="text-center max-w-sm w-full">
        <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-5">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground mb-3">تم إيقاف الحساب مؤقتاً</h1>
        <div className="bg-card border border-card-border rounded-xl p-4 mb-5">
          <p className="text-sm text-foreground leading-relaxed">{message}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة المحاولة</span>
        </button>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("najm_token"));
  const [localUser, setLocalUser] = useState<User | null>(null);
  const [suspensionMessage, setSuspensionMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: meData, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (!isError || !token) return;
    fetch(`${getApiBaseUrl()}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async r => {
        if (r.status === 403) {
          const body = await r.json().catch(() => ({}));
          if (body.error === "suspended") {
            setSuspensionMessage(body.message || "حسابك موقوف مؤقتاً. تواصل مع المعلم لرفع الإيقاف.");
            return;
          }
        }
        localStorage.removeItem("najm_token");
        setToken(null);
        setLocalUser(null);
      })
      .catch(() => {
        localStorage.removeItem("najm_token");
        setToken(null);
        setLocalUser(null);
      });
  }, [isError, token]);

  useEffect(() => {
    if (meData) setSuspensionMessage(null);
  }, [meData]);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem("najm_token", newToken);
    setToken(newToken);
    setLocalUser(newUser);
    setSuspensionMessage(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("najm_token");
    setToken(null);
    setLocalUser(null);
    setSuspensionMessage(null);
    queryClient.clear();
  }, [queryClient]);

  const user = useMemo<User | null>(() => {
    if (localUser) return localUser;
    if (meData) return meData as User;
    return null;
  }, [localUser, meData]);

  const isPaidForSubject = useCallback((subjectId: number): boolean => {
    if (!user) return false;
    if (user.accessRole === "admin") return true;
    const ids: number[] = user.paidSubjectIds ?? [];
    return ids.includes(subjectId);
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
      {suspensionMessage ? <SuspensionScreen message={suspensionMessage} /> : children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
