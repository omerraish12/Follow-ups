// src/pages/Profile.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Profile() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = language === "he";

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    clinic: user?.clinicName || ""
  });

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, scope: "profile" | "password") => {
    const { name, value } = e.target;
    scope === "profile"
      ? setForm(prev => ({ ...prev, [name]: value }))
      : setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-2xl border-border shadow-card">
          <CardHeader>
            <CardTitle>{t("profile")}</CardTitle>
            <CardDescription>{t("profile_subtitle") || t("my_account")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className={isRtl ? "text-right" : ""}>{t("full_name")}</Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(e) => handleChange(e, "profile")}
                  className={isRtl ? "text-right" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinic" className={isRtl ? "text-right" : ""}>{t("clinic_name")}</Label>
                <Input
                  id="clinic"
                  name="clinic"
                  value={form.clinic}
                  onChange={(e) => handleChange(e, "profile")}
                  className={isRtl ? "text-right" : ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email" className={isRtl ? "text-right" : ""}>{t("email")}</Label>
                <Input
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => handleChange(e, "profile")}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className={isRtl ? "text-right" : ""}>{t("phone_number")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={form.phone}
                  onChange={(e) => handleChange(e, "profile")}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="rounded-xl">{t("save")}</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-card">
          <CardHeader>
            <CardTitle>{t("change_password_title")}</CardTitle>
            <CardDescription>{t("change_password_subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current" className={isRtl ? "text-right" : ""}>{t("current_password")}</Label>
              <Input
                id="current"
                name="current"
                type="password"
                value={passwordForm.current}
                onChange={(e) => handleChange(e, "password")}
                dir="ltr"
              />
            </div>
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="next" className={isRtl ? "text-right" : ""}>{t("new_password")}</Label>
                <Input
                  id="next"
                  name="next"
                  type="password"
                  value={passwordForm.next}
                  onChange={(e) => handleChange(e, "password")}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm" className={isRtl ? "text-right" : ""}>{t("confirm_password")}</Label>
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => handleChange(e, "password")}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" className="rounded-xl">{t("save")}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
