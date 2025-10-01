"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function IndexRedirect() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try { await sdk.actions.ready(); } catch { }
      if (!cancelled) router.replace('/home');
    };
    init();
    return () => { cancelled = true; };
  }, [router]);
  return null;
}

// index now redirects to /home and contains no UI
