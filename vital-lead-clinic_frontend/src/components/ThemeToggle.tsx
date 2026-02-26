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
        "rounded-xl transition-colors",
        onDark
          ? "border-white/30 bg-white/15 text-white hover:bg-white/25 hover:text-white"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {effectiveTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
