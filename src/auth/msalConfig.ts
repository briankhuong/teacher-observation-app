// src/auth/msalConfig.ts
import { LogLevel } from "@azure/msal-browser";

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_AD_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_AD_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_AD_REDIRECT_URI,
    postLogoutRedirectUri:
      import.meta.env.VITE_AZURE_AD_REDIRECT_URI.split("/auth/redirect")[0],
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      // 👇 Explicitly typed parameters – no more implicit any
      loggerCallback: (
        level: LogLevel,
        message: string,
        containsPii: boolean
      ): void => {
        if (containsPii) return;

        switch (level) {
          case LogLevel.Error:
            console.error(message);
            break;
          case LogLevel.Warning:
            console.warn(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Verbose:
            console.debug(message);
            break;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// Required for Supabase Auth OIDC flow
export const loginRequest = {
  scopes: ["openid", "profile", "User.Read"],
};
