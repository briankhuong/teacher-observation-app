// src/auth/RedirectHandler.tsx
import * as React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { msalInstance, msalInitPromise } from "./msalInstance";
import { useAuth } from "./AuthContext"; 
import { supabase } from "../supabaseClient";

const RedirectHandler: React.FC = () => {
  const navigate = useNavigate();
  // Ensure useAuth provides the session object
  const { session } = useAuth(); 

  useEffect(() => {
    let ignore = false;

    const finalizeAuth = async () => {
      // 1. If Supabase session is already established, navigate away.
      if (session) {
        if (!ignore) navigate("/", { replace: true });
        return;
      }
      
      // 2. Wait for MSAL to handle the redirect URL fragment and cache the tokens.
      await msalInitPromise;
      
      const activeAccount = msalInstance.getActiveAccount();

      if (activeAccount) {
        try {
          // 3. Acquire the ID Token from MSAL (needed for Supabase exchange).
          const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: ["openid", "profile"], 
            account: activeAccount
          });

          const idToken = tokenResponse.idToken;

          // 4. Exchange the ID Token for a Supabase Session.
          if (idToken) {
            const { data, error } = await supabase.auth.signInWithIdToken({
              provider: 'azure', 
              token: idToken,
            });
            
            if (error) {
              console.error("[Supabase Exchange Error]", error);
            } else if (data.session) {
              console.log("[Supabase Exchange Success] Session created via ID Token.");
            }
          }
        } catch (error) {
          console.error("[MSAL/Supabase Finalization Error]", error);
        }
      } 
      
      // 5. Navigate back to the main app root
      if (!ignore) {
        setTimeout(() => {
            navigate("/", { replace: true });
        }, 300); 
      }
    };

    void finalizeAuth();
    
    return () => { ignore = true; };
  }, [navigate, session]);

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-title">Teacher Observation</div>
        <div className="auth-subtitle">Finalizing Microsoft sign-in and creating Supabase session…</div>
      </div>
    </div>
  );
};

export default RedirectHandler;