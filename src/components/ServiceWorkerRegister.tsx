"use client";

import { useEffect } from "react";

/**
 * Registers the offline shell service worker in production builds.
 * Dev stays uncached so hot reload is never fought by stale assets.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is a bonus, never a crash */
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
