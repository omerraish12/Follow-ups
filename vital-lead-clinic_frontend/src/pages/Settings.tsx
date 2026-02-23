import { User, Bell, Shield, Database, Globe, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-5 lg:space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">הגדרות</h1>
        <p className="text-sm text-muted-foreground mt-0.5">ניהול הגדרות המערכת והמרפאה</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: User, title: "פרופיל", desc: "ניהול חשבון ופרטי המרפאה", color: "text-primary", bg: "bg-primary/10" },
          { icon: Bell, title: "התראות", desc: "הגדרת העדפות התראות", color: "text-warning", bg: "bg-warning/10" },
          { icon: Shield, title: "תפקידים והרשאות", desc: "ניהול תפקידי משתמשים", color: "text-success", bg: "bg-success/10" },
          { icon: Database, title: "נתונים", desc: "ייצוא וייבוא נתונים", color: "text-info", bg: "bg-info/10" },
          { icon: Globe, title: "אינטגרציות", desc: "חיבור שירותים חיצוניים", color: "text-accent", bg: "bg-accent/10" },
          { icon: Palette, title: "עיצוב", desc: "התאמה אישית של המראה", color: "text-destructive", bg: "bg-destructive/10" },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all cursor-pointer animate-fade-in"
          >
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.bg}`}>
              <item.icon className={`h-5 w-5 ${item.color}`} />
            </div>
            <h3 className="mt-4 font-bold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl gradient-hero border border-primary/10 p-5 lg:p-6 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning">
            ⚡ מצב הדגמה
          </span>
        </div>
        <h3 className="font-bold text-foreground">מערכת בגרסת הדגמה</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
          זוהי גרסת הדגמה של מערכת ניהול הלידים. כל הנתונים המוצגים הם נתוני דוגמה.
          חבר את חשבון ה-WhatsApp Business API ואת מסד הנתונים כדי לעבור למצב פעיל.
        </p>
      </div>
    </div>
  );
}
