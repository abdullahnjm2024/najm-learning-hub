import { useState, useEffect, createContext, useContext } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const token = localStorage.getItem("najm_token");

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: { 
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false
    }
  });

  const isLoading = (!!token && isUserLoading);
  const isAuthenticated = !!user && !isError;

  const logout = () => {
    localStorage.removeItem("najm_token");
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user: user || null, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
