"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const RegionContext = createContext<{
  region: string;
  setRegion: (r: string) => void;
}>({
  region: "us-east-1",
  setRegion: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegion] = useState("us-east-1");
  return (
    <RegionContext.Provider value={{ region, setRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
