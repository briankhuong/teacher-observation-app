// src/auth/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";   // <-- USE THE SHARED CLIENT

// ----------------------------
// Context types
// ----------------------------
interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ----------------------------
// Provider
// ----------------------------
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadSession() {
      setLoading(true);
      const { data } = await supabase.auth.getSession();
      const current = data.session ?? null;

      if (!ignore) {
        setSession(current);
        setUser(current?.user ?? null);
        setLoading(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  // ----------------------------
  // Sign-in with Azure
  // ----------------------------
 const signInWithAzure = async () => {
  setLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "azure",
    options: {
      // Ask Azure for Graph scopes, including Mail.Send
      scopes: "openid email profile offline_access User.Read Mail.Send",
      // Force the consent screen so the new scopes are actually granted
      queryParams: {
        prompt: "consent",
      },
    },
  });

  if (error) {
    console.error("[Auth] Azure sign-in error:", error);
    alert("Could not sign in. Please try again.");
    setLoading(false);
  }
};

  // ----------------------------
  // Sign-out (local only)
  // ----------------------------
  const signOut = async () => {
    try {
      // If Supabase already has no session, just clear our state and bail.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setSession(null);
        setUser(null);
        return;
      }

      // Local-only logout: avoid Azure/global 403.
      const { error } = await supabase.auth.signOut({ scope: "local" });

      if (error) {
        console.error("[Auth] signOut error", error);
        alert("Could not sign out. Please try again.");
      }
    } catch (err) {
      console.error("[Auth] unexpected signOut error", err);
      alert("Could not sign out. Please try again.");
    } finally {
      // Make sure UI updates either way
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signInWithAzure,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ----------------------------
// Hook
// ----------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
