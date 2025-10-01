"use client";

import { ReactNode } from "react";
import { NightlyConnectAptosProvider } from "../lib/nightly/NightlyProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return <NightlyConnectAptosProvider>{children}</NightlyConnectAptosProvider>;
}


