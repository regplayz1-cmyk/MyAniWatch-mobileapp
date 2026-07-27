import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiLogin, apiSignup, apiGetMe } from "../services/api";

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  role?: string;
  customTag?: string;
  nameGradient?: string;
  nameFont?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  signup: (u: string, e: string, p: string, pc: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        const me = await apiGetMe();
        if (me) {
          setUser(me);
          await AsyncStorage.setItem("user", JSON.stringify(me));
        }
      }
    } catch {
      // Ignore token failure
    } finally {
      setLoading(false);
    }
  };

  const login = async (u: string, p: string) => {
    const res = await apiLogin(u, p);
    if (res.user) setUser(res.user);
  };

  const signup = async (u: string, e: string, p: string, pc: string) => {
    const res = await apiSignup(u, e, p, pc);
    if (res.user) setUser(res.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
