import { useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  tone?: "light" | "dark";
  className?: string;
};

export default function ThemeToggle({ tone = "light", className }: Props) {
  const [mounted, setMounted] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const onDark = tone === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveTheme = useMemo(() => {
    if (!mounted) return "light";
    return theme === "system" ? resolvedTheme || "light" : theme || "light";
  }, [mounted, theme, resolvedTheme]);

  const handleToggle = () => {
    setTheme(effectiveTheme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleToggle}
      aria-label={effectiveTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "group relative overflow-hidden rounded-full w-11 h-11 flex items-center justify-center border transition-all duration-300",
        onDark
          ? "border-white/35 bg-white/12 text-white hover:bg-white/22 hover:border-white/45"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:shadow-[0_10px_30px_-18px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      <span
        className={cn(
          "absolute inset-0 scale-0 rounded-full bg-primary/15 blur-lg transition-transform duration-300",
          "group-hover:scale-100"
        )}
      />
      {effectiveTheme === "dark" ? (
        <Sun className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105" />
      ) : (
        <Moon className="h-4 w-4 relative z-10 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105" />
      )}
    </Button>
  );
}
