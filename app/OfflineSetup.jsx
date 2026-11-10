"use client";
import { useEffect } from "react";

export default function OfflineSetup() {
  useEffect(() => {
    navigator.serviceWorker?.register("/portfolio-offline-sw.js").catch(() => {});
  }, []);
  return null;
}
