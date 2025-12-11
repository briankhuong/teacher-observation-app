// src/auth/MsalProvider.tsx

import { type ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import type { IPublicClientApplication } from "@azure/msal-browser";

import { msalInstance } from "./msalInstance";

interface MsalAppProviderProps {
  children: ReactNode;
}

export const MsalAppProvider = ({ children }: MsalAppProviderProps) => {
  return (
    <MsalProvider instance={msalInstance as IPublicClientApplication}>
      {children}
    </MsalProvider>
  );
};
