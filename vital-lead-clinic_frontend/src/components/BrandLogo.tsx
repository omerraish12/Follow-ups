// src/components/BrandLogo.tsx
import { useTheme } from "next-themes";
import LightLogo from "@/assets/followup-logo-light.svg";
import DarkLogo from "@/assets/followup-logo-dark.svg";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

export default function BrandLogo({ className }: Props) {
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const mode = mounted ? (theme === "system" ? resolvedTheme : theme) : "light";
  const src = mode === "dark" ? DarkLogo : LightLogo;

  return <img src={src} alt="FollowUp" className={cn("h-10 w-10", className)} />;
}
