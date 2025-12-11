// src/auth/msalInstance.ts

import {
  PublicClientApplication,
  EventType,
  type AuthenticationResult,
  type IPublicClientApplication,
} from "@azure/msal-browser";

import { msalConfig } from "./msalConfig";

declare global {
  interface Window {
    msalInstance: IPublicClientApplication;
  }
}

// Singleton instance
if (!window.msalInstance) {
  window.msalInstance = new PublicClientApplication(msalConfig);
}

export const msalInstance = window.msalInstance;

// Initialization promise
export const msalInitPromise = msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .then((response) => {
    if (response?.account) {
      msalInstance.setActiveAccount(response.account);
    }
  });

// Event logging & auto-active-account
msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS ||
    event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
  ) {
    const payload = event.payload as AuthenticationResult;
    if (payload?.account) {
      msalInstance.setActiveAccount(payload.account);
      console.log(`[MSAL Event] Success: ${payload.account.username}`);
    }
  }

  if (
    event.eventType === EventType.LOGIN_FAILURE ||
    event.eventType === EventType.ACQUIRE_TOKEN_FAILURE
  ) {
    console.error("[MSAL] Failure:", event.error);
  }
});
