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
      <Globe className={`h-4 w-4 ${onDark ? "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]" : "text-muted-foreground"}`} />
      <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "he")}>
        <SelectTrigger
          className={`w-[120px] transition-colors ${
            onDark
              ? "bg-white/15 text-white border border-white/30 hover:bg-white/20 focus:ring-0 focus:ring-offset-0 placeholder:text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
              : ""
          }`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("english")}</SelectItem>
          <SelectItem value="he">{t("hebrew")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
