// src/pages/Pricing.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CheckCircle, Shield, Clock, Users, Loader2, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { pricingService, type PricingPlan } from "@/services/pricingService";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const BULLET = "\u2022";
const formatLimits = (plan: PricingPlan, t: (k: string) => string) => {
  const contacts = plan.contactsLimit ? `${plan.contactsLimit.toLocaleString()} ${t("contacts")}` : t("unlimited_contacts");
  const users = plan.usersLimit ? `${plan.usersLimit} ${t("users_lower")}` : t("unlimited_users");
  return `${contacts} ${BULLET} ${users}`;
};

const PLAN_CTA_ROUTES: Record<string, (planId: string) => string> = {
  start_trial: (planId) => `/signup?plan=${planId}`,
  talk_to_sales: () => "/contact",
};

const resolveCtaUrl = (plan: PricingPlan) => {
  const resolver = PLAN_CTA_ROUTES[plan.cta];
  return resolver ? resolver(plan.id) : `/signup?plan=${plan.id}`;
};

const formatPriceLabel = (plan: PricingPlan, language: string, t: (k: string) => string) => {
  if (plan.price === 0) {
    return t("plan_free_price");
  }

  const locale = language === "he" ? "he-IL" : "en-US";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: plan.currency || "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(plan.price);
  } catch {
    return `${plan.currency || ""} ${plan.price}`;
  }
};

export default function Pricing() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const isRtl = language === "he";
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBankPlan, setSelectedBankPlan] = useState<PricingPlan | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await pricingService.getPlans();
        setPlans(data);
      } catch (error) {
        console.error("Failed to load pricing plans", error);
        toast({ title: t("error"), description: t("error_loading_data"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!plans.length) return;
    const params = new URLSearchParams(location.search);
    const planId = params.get("plan");
    if (!planId) return;
    const targetPlan = plans.find((plan) => plan.id === planId && plan.paymentMethod === "bank_transfer");
    if (targetPlan) {
      setSelectedBankPlan(targetPlan);
    }
  }, [location.search, plans]);

  const translatedPlans = useMemo(() => {
    if (!plans.length) return [];
    return plans.map((plan) => ({
      ...plan,
      name: t(plan.name),
      badge: plan.badge ? t(plan.badge) : "",
      priceLabel: formatPriceLabel(plan, language, t),
      limits: formatLimits(plan, t),
      features: plan.features.map((key) => t(key)),
      cta: t(plan.cta),
      ctaLink: resolveCtaUrl(plan),
    }));
  }, [plans, language, t]);

  const handleBankTransferClick = (plan: PricingPlan) => {
    setSelectedBankPlan(plan);
  };

  const handleCopyValue = async (value: string, label: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: t("copied"),
        description: t("bank_transfer_value_copied").replace("{field}", label),
      });
    } catch (error) {
      console.error("Failed to copy value", error);
      toast({
        title: t("error"),
        description: t("bank_transfer_copy_failed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-gradient-to-b from-background to-secondary/10">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="text-center space-y-3 mb-10">
          <Badge variant="outline" className="px-3 py-1 text-primary border-primary/30 bg-primary/5">
            {t("pricing_badge")}
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("pricing_title")}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t("pricing_subtitle")}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {(loading ? [1, 2, 3] : translatedPlans).map((plan, idx) => (
            <Card
              key={idx}
              className={cn(
                "rounded-2xl border-border shadow-card h-full flex flex-col",
                !loading && plan.highlight && "border-primary/50 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.45)]"
              )}
            >
              {loading ? (
                <CardContent className="space-y-4 py-6">
                  <div className="h-6 w-24 bg-muted rounded-md animate-pulse" />
                  <div className="h-5 w-32 bg-muted rounded-md animate-pulse" />
                  <div className="h-4 w-40 bg-muted rounded-md animate-pulse" />
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 w-full bg-muted rounded-md animate-pulse" />
                  ))}
                  <div className="h-10 w-full bg-muted rounded-xl animate-pulse" />
                </CardContent>
              ) : (
                <>
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                      {plan.badge && (
                        <Badge className="bg-primary/15 text-primary border border-primary/20">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-2xl font-bold text-foreground">
                      {plan.priceLabel}
                      <span className="text-sm text-muted-foreground ml-1">{t("per_month")}</span>
                    </CardDescription>
                    <p className="text-sm text-muted-foreground">{plan.limits}</p>
                  </CardHeader>
                    <CardContent className="space-y-4 flex-1">
                      <div className="space-y-3 text-sm">
                        {plan.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    {plan.paymentMethod === "bank_transfer" && plan.bankTransferDetails ? (
                      <Button
                        size="lg"
                        variant={plan.highlight ? "secondary" : "default"}
                        className="w-full rounded-xl h-11 mt-auto"
                        onClick={() => handleBankTransferClick(plan)}
                      >
                        {t("pricing_bank_transfer_button")}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        size="lg"
                        variant={plan.highlight ? "secondary" : "default"}
                        className="w-full rounded-xl h-11 mt-auto"
                      >
                        <Link to={plan.ctaLink}>{plan.cta}</Link>
                      </Button>
                    )}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Shield, title: t("secure_by_design"), text: t("security_text") },
            { icon: Clock, title: t("fast_onboarding"), text: t("onboarding_text") },
            { icon: Users, title: t("multi_clinic_ready"), text: t("multiclinic_text") },
            { icon: CheckCircle, title: t("no_commitment"), text: t("trial_text") },
          ].map(({ icon: Icon, title, text }, i) => (
            <Card key={i} className="rounded-2xl border-dashed border-border/70 bg-card/60">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <Dialog open={Boolean(selectedBankPlan)} onOpenChange={(open) => !open && setSelectedBankPlan(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("bank_transfer_modal_title")}</DialogTitle>
            <DialogDescription>{t("bank_transfer_modal_description")}</DialogDescription>
          </DialogHeader>
          {selectedBankPlan?.bankTransferDetails && (
            <div className="space-y-4 py-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("bank_transfer_account_holder")}</p>
                  <p className="font-semibold">{selectedBankPlan.bankTransferDetails.accountName}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopyValue(selectedBankPlan.bankTransferDetails?.accountName ?? "", t("bank_transfer_account_holder"))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("bank_transfer_bank_name")}</p>
                  <p className="font-semibold">{selectedBankPlan.bankTransferDetails.bankName}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopyValue(selectedBankPlan.bankTransferDetails?.bankName ?? "", t("bank_transfer_bank_name"))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("bank_transfer_iban")}</p>
                  <p className="font-semibold">{selectedBankPlan.bankTransferDetails.iban}</p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleCopyValue(selectedBankPlan.bankTransferDetails?.iban ?? "", t("bank_transfer_iban"))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {selectedBankPlan.bankTransferDetails.swift && (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("bank_transfer_swift")}</p>
                    <p className="font-semibold">{selectedBankPlan.bankTransferDetails.swift}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopyValue(selectedBankPlan.bankTransferDetails?.swift ?? "", t("bank_transfer_swift"))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {selectedBankPlan.bankTransferDetails.reference && (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{t("bank_transfer_reference")}</p>
                    <p className="font-semibold">{selectedBankPlan.bankTransferDetails.reference}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => handleCopyValue(selectedBankPlan.bankTransferDetails?.reference ?? "", t("bank_transfer_reference"))}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {selectedBankPlan.bankTransferDetails.instructions && (
                <p className="text-sm text-muted-foreground">{selectedBankPlan.bankTransferDetails.instructions}</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelectedBankPlan(null)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
