import { useLanguage } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

type Props = {
  /** Use "dark" when the control sits on a dark/primary header */
  tone?: "light" | "dark";
};

export default function LanguageSwitcher({ tone = "light" }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const onDark = tone === "dark";

  return (
    <div className="flex items-center gap-2">
      <Globe
        className={`h-4 w-4 transition-transform duration-300 ${
          onDark ? "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" : "text-muted-foreground"
        }`}
      />
      <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "he")}>
        <SelectTrigger
          className={`w-[128px] rounded-full pl-3 pr-8 h-10 text-sm font-medium transition-all duration-300 ${
            onDark
              ? "bg-white/15 text-white border border-white/30 hover:bg-white/25 focus:ring-0 focus:ring-offset-0 placeholder:text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
              : "bg-card/90 border border-border hover:border-primary/40 hover:shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                language === "he"
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary/30 text-foreground"
              }`}
            >
              {language === "he" ? "HE" : "EN"}
            </span>
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl shadow-xl">
          <SelectItem value="en" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-secondary/40 text-[11px] font-semibold">EN</span>
            {t("english")}
          </SelectItem>
          <SelectItem value="he" className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">HE</span>
            {t("hebrew")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
