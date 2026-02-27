// src/pages/LandingPage.tsx
import {
  Phone, DollarSign, Clock, MessageSquare, Users, Zap,
  BarChart3, Shield, ChevronLeft, Star, CheckCircle,
  ArrowLeft, Sparkles, Rocket, Target, HeartHandshake,
  Activity, TrendingUp, Calendar, MessageCircle,
  Award, Download, Play, Pause, RotateCcw, Bell,
  PhoneCall, Video, MoreVertical, Send, Smile, Paperclip,
  Badge
} from "lucide-react";
import { Grid, Instagram, Linkedin, Mail, Slack } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import LogoMark from "@/assets/logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";

type CountUpValueProps = {
  target: number;
  isActive: boolean;
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  locale?: string;
};

function CountUpValue({
  target,
  isActive,
  durationMs = 1200,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "en-US",
}: CountUpValueProps) {
  const [value, setValue] = useState(0);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!isActive || hasAnimatedRef.current) return;

    hasAnimatedRef.current = true;
    let rafId = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(target * easedProgress);

      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    rafId = window.requestAnimationFrame(step);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [durationMs, isActive, target]);

  const formattedValue = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return <>{`${prefix}${formattedValue}${suffix}`}</>;
}

export default function LandingPage() {
  const { t, language, setLanguage } = useLanguage();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState({});
  const [activeChat, setActiveChat] = useState<'old' | 'new' | 'both' | null>(null);
  const [chatMessages, setChatMessages] = useState({
    old: [],
    new: []
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const sectionRefs = useRef({});
  const navRef = useRef<HTMLElement | null>(null);
  const chatPreviewMessages = useMemo(
    () => [
      { time: "2m", name: "Yossi Cohen", text: t("landing_hero_chat_msg1"), avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80", icon: Grid, bg: "#111827", color: "#ffffff" },
      { time: "5m", name: "Michal Levi", text: t("landing_hero_chat_msg2"), avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&q=80", icon: MessageCircle, bg: "#25D366", color: "#ffffff" },
      { time: "8m", name: "Danny Abraham", text: t("landing_hero_chat_msg3"), avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&q=80&sat=-30", icon: Mail, bg: "#EA4335", color: "#ffffff" },
      { time: "12m", name: "Noa Shimon", text: t("landing_hero_chat_msg4"), avatar: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80&sat=-20", icon: Instagram, bg: "#F56040", color: "#ffffff" },
      { time: "15m", name: "Alon Peretz", text: t("landing_hero_chat_msg5"), avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&q=80", icon: Linkedin, bg: "#0A66C2", color: "#ffffff" },
      { time: "18m", name: "Eden Tal", text: t("landing_hero_chat_msg6"), avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80", icon: Slack, bg: "#4A154B", color: "#ffffff" },
    ],
    [t, language]
  );

  // דמו מונפש - הודעות לדוגמה
  const demoScenarios = [
    {
      title: t("landing_demo_scenario1_title"),
      steps: [
        { time: 0, message: t("landing_demo_scenario1_step1"), icon: Clock },
        { time: 2, message: t("landing_demo_scenario1_step2"), icon: MessageSquare },
        { time: 5, message: t("landing_demo_scenario1_step3"), icon: Phone },
        { time: 7, message: t("landing_demo_scenario1_step4"), icon: TrendingUp },
        { time: 10, message: t("landing_demo_scenario1_step5"), icon: Bell },
        { time: 15, message: t("landing_demo_scenario1_step6"), icon: DollarSign },
      ]
    },
    {
      title: t("landing_demo_scenario2_title"),
      steps: [
        { time: 0, message: t("landing_demo_scenario2_step1"), icon: MessageSquare },
        { time: 1, message: t("landing_demo_scenario2_step2"), icon: Zap },
        { time: 3, message: t("landing_demo_scenario2_step3"), icon: Rocket },
        { time: 6, message: t("landing_demo_scenario2_step4"), icon: Clock },
        { time: 8, message: t("landing_demo_scenario2_step5"), icon: Bell },
        { time: 12, message: t("landing_demo_scenario2_step6"), icon: CheckCircle },
      ]
    }
  ];

  const faqItems = [
    {
      question: t("landing_faq_q1"),
      answer: t("landing_faq_a1")
    },
    {
      question: t("landing_faq_q2"),
      answer: t("landing_faq_a2")
    },
    {
      question: t("landing_faq_q3"),
      answer: t("landing_faq_a3")
    },
    {
      question: t("landing_faq_q4"),
      answer: t("landing_faq_a4")
    },
    {
      question: t("landing_faq_q5"),
      answer: t("landing_faq_a5")
    }
  ];

  // אנימציית צ'אט - לקוח ישן
  const oldClientMessages = [
    { id: 1, type: 'received', text: t("landing_chat_old_1"), delay: 500, status: 'sent' },
    { id: 2, type: 'received', text: t("landing_chat_old_2"), delay: 1500, status: 'sent' },
    { id: 3, type: 'sent', text: t("landing_chat_old_3"), delay: 3000, status: 'delivered' },
    { id: 4, type: 'received', text: t("landing_chat_old_4"), delay: 4500, status: 'sent' },
    { id: 5, type: 'sent', text: t("landing_chat_old_5"), delay: 6000, status: 'read' },
    { id: 6, type: 'received', text: t("landing_chat_old_6"), delay: 7500, status: 'sent' },
    { id: 7, type: 'system', text: t("landing_chat_old_7"), delay: 8000, status: 'alert' },
  ];

  // אנימציית צ'אט - לקוח חדש
  const newClientMessages = [
    { id: 1, type: 'sent', text: t("landing_chat_new_1"), delay: 500, status: 'read' },
    { id: 2, type: 'received', text: t("landing_chat_new_2"), delay: 2000, status: 'sent' },
    { id: 3, type: 'sent', text: t("landing_chat_new_3"), delay: 3500, status: 'delivered' },
    { id: 4, type: 'received', text: t("landing_chat_new_4"), delay: 5000, status: 'sent' },
    { id: 5, type: 'sent', text: t("landing_chat_new_5"), delay: 6500, status: 'read' },
    { id: 6, type: 'received', text: t("landing_chat_new_6"), delay: 8000, status: 'sent' },
    { id: 7, type: 'system', text: t("landing_chat_new_7"), delay: 8500, status: 'alert' },
  ];

  useEffect(() => {
    const initialTheme = resolvedTheme || theme || "light";
    setTheme("light");
    return () => setTheme(initialTheme);
  }, [resolvedTheme, setTheme, theme]);

  useEffect(() => {
    const observers = {};

    Object.keys(sectionRefs.current).forEach((key) => {
      observers[key] = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(prev => ({ ...prev, [key]: entry.isIntersecting }));
        },
        { threshold: 0.2, rootMargin: '0px' }
      );

      if (sectionRefs.current[key]) {
        observers[key].observe(sectionRefs.current[key]);
      }
    });

    return () => {
      Object.values(observers).forEach(observer => observer.disconnect());
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsNavScrolled(window.scrollY > 40);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const updateHeaderHeight = () => {
      const next = Math.round(navEl.offsetHeight || 0);
      if (next > 0) setHeaderHeight(next);
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(navEl);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
      observer.disconnect();
    };
  }, [isNavScrolled, language]);

  const startChatAnimation = () => {
    setChatMessages({ old: [], new: [] });
    setActiveChat('both');
    setIsPlaying(true);

    // Reset messages
    oldClientMessages.forEach((msg) => {
      setTimeout(() => {
        setChatMessages(prev => ({
          ...prev,
          old: [...prev.old, msg]
        }));
      }, msg.delay);
    });

    newClientMessages.forEach((msg) => {
      setTimeout(() => {
        setChatMessages(prev => ({
          ...prev,
          new: [...prev.new, msg]
        }));
      }, msg.delay);
    });

    // Start step animation
    let step = 0;
    const interval = setInterval(() => {
      if (step < demoScenarios[0].steps.length - 1) {
        step++;
        setCurrentStep(step);
      } else {
        clearInterval(interval);
        setIsPlaying(false);
      }
    }, 2000);
  };

  const resetAnimation = () => {
    setChatMessages({ old: [], new: [] });
    setActiveChat(null);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const fadeInUpClass = (section) =>
    `transition-all duration-1000 transform ${isVisible[section]
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-10'
    }`;

  const MessageStatus = ({ status }) => {
    switch (status) {
      case 'sent':
        return <span className="text-[10px] text-gray-400 mr-1">✓</span>;
      case 'delivered':
        return <span className="text-[10px] text-gray-400 mr-1">✓✓</span>;
      case 'read':
        return <span className="text-[10px] text-blue-400 mr-1">✓✓</span>;
      default:
        return null;
    }
  };

  const TypingIndicator = () => (
    <div className="mr-auto max-w-[60px] rounded-xl rounded-br-sm bg-card border border-border p-3">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
      </div>
    </div>
  );

  const navLinkClass = cn(
    "text-sm font-semibold tracking-tight transition-all duration-300 hover:-translate-y-[1px] relative group",
    isNavScrolled
      ? "text-foreground/80 hover:text-foreground"
      : "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)]"
  );

  const heroSectionClass = "relative overflow-hidden flex items-center py-16 sm:py-20 md:py-24";
  const sectionTallClass = "section-pro-bg scroll-mt-28 min-h-[calc(100svh-4.75rem)] md:min-h-screen flex items-center py-12 sm:py-16";
  const sectionRegularClass = "section-pro-bg scroll-mt-28 py-16 sm:py-20";
  const sectionCompactClass = "section-pro-bg scroll-mt-28 py-12 sm:py-14";
  const mobileNavItems = [
    { href: "#how", label: t("landing_nav_how") },
    { href: "#demo", label: t("landing_nav_demo") },
    { href: "#results", label: t("landing_nav_results") },
    { href: "#pricing", label: t("landing_nav_pricing") },
    { href: "#faq", label: t("landing_nav_faq") },
  ];
  const numberLocale = language === "he" ? "he-IL" : "en-US";
  const shekelPrefix = String.fromCharCode(0x20aa);
  const isStatsVisible = Boolean(isVisible["stats"]);
  const isResultsVisible = Boolean(isVisible["results"]);
  const languageCode = language === "he" ? "HE" : "EN";
  const toggleLanguage = () => setLanguage(language === "en" ? "he" : "en");

  const userDisplayName = (user?.name || user?.email || "").split("@")[0];
  const isAuthenticated = Boolean(user);

  return (
    <div className="relative min-h-screen bg-background font-sans">
      {/* Background layers (visible sitewide) */}
      <div
        className="absolute inset-x-0 -z-10 overflow-hidden landing-bg"
        style={{ top: 0, bottom: 0 }}
      >
        <div className="mesh-layer" />
        <div className="grid-layer" />
        <div className="noise-layer" />
        <div className="gradient-blob bg-primary/32 left-6 top-16 w-80 h-80" />
        <div className="gradient-blob bg-secondary/30 right-8 top-1/4 w-96 h-96 animation-delay-4" />
        <div className="gradient-blob bg-info/24 left-1/2 top-1/2 w-88 h-88 animation-delay-8" />
        <div className="light-line line-1" />
        <div className="light-line line-2" />
      </div>

      {/* Navbar */}
      <nav
        ref={navRef}
        className={cn(
          "sticky top-0 z-50 transition-all duration-300 backdrop-blur-md supports-[backdrop-filter]:backdrop-blur-md",
          isNavScrolled
            ? "bg-card/90 border-b border-border text-foreground shadow-sm"
            : "bg-primary text-white border-b border-primary/40 shadow-none"
        )}
      >
        <div className="mx-auto flex max-w-[96rem] items-center justify-between px-4 py-2 sm:py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-gradient-to-br from-white/20 to-white/5 shadow-lg shadow-white/20">
              <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white">FU</span>
              <span className="absolute inset-0 rounded-full border border-white/30 opacity-40 animate-ping" />
            </div>
            <div className={cn(
              "flex flex-col leading-tight",
              isNavScrolled ? "text-foreground" : "text-white"
            )}>
              <span className="text-base sm:text-lg md:text-xl font-black tracking-tight bg-gradient-to-r from-[#f565bc] to-[#60a5fa] bg-clip-text text-transparent animate-[pulse_2s_ease-in-out_infinite]">
                Follow-ups
              </span>
              <span className="text-[10px] uppercase tracking-[0.5em] text-white/70">
                {t("landing_nav_brand_hint")}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how" className={navLinkClass}>
              {t("landing_nav_how")}
              <span className={cn("absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full", isNavScrolled ? "bg-primary" : "bg-white")}></span>
            </a>
            <a href="#demo" className={navLinkClass}>
              {t("landing_nav_demo")}
              <span className={cn("absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full", isNavScrolled ? "bg-primary" : "bg-white")}></span>
            </a>
            <a href="#pricing" className={navLinkClass}>
              {t("landing_nav_pricing")}
              <span className={cn("absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full", isNavScrolled ? "bg-primary" : "bg-white")}></span>
            </a>
            <a href="#results" className={navLinkClass}>
              {t("landing_nav_results")}
              <span className={cn("absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full", isNavScrolled ? "bg-primary" : "bg-white")}></span>
            </a>
            <a href="#faq" className={navLinkClass}>
              {t("landing_nav_faq")}
              <span className={cn("absolute bottom-0 left-0 w-0 h-0.5 transition-all duration-300 group-hover:w-full", isNavScrolled ? "bg-primary" : "bg-white")}></span>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleLanguage}
              aria-label={`Switch language (current ${languageCode})`}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-lg",
                isNavScrolled
                  ? "border-border/60 bg-card/60 text-muted-foreground shadow-card"
                  : "border-white/60 bg-white/20 text-white shadow-white/40"
              )}
            >
              <span className="text-[11px] font-semibold tracking-[0.35em] uppercase">{languageCode}</span>
            </button>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className={cn(
                  "hidden sm:flex h-12 items-center rounded-3xl border border-white/30 bg-white/10 px-4 py-2 text-left shadow-[0_12px_40px_rgba(30,64,175,0.3)] transition-all duration-300 hover:-translate-y-[1px] hover:border-white/70",
                  isNavScrolled ? "backdrop-blur-sm bg-white/10 border-border/40 text-foreground" : "text-white"
                )}
              >
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] uppercase tracking-[0.35em] text-white/80">
                    {t("landing_nav_signed_in_as")}
                  </span>
                  <span className="text-sm font-semibold">{userDisplayName || t("landing_nav_dashboard")}</span>
                </div>
              </Link>
            ) : (
              <div className="flex gap-3">
                <Link
                  to="/login"
                  className={cn(
                    "hidden sm:inline-flex text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105",
                    isNavScrolled
                      ? "text-muted-foreground hover:text-foreground"
                      : "text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.28)] hover:text-white"
                  )}
                >
                  {t("landing_nav_login")}
                </Link>
                <Link
                  to="/signup"
                  className={cn(
                    "rounded-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg",
                    isNavScrolled
                      ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:shadow-primary/30"
                      : "bg-white/20 text-white border border-white/30 hover:bg-white/25"
                  )}
                >
                  {t("landing_nav_start_now")}
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className={cn(
          "md:hidden border-t px-3 py-2",
          isNavScrolled ? "border-border/80 bg-card/80" : "border-white/20 bg-black/10"
        )}>
          <div className="mx-auto max-w-[96rem] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-center gap-2 min-w-max">
              {mobileNavItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-200",
                    isNavScrolled
                      ? "border-border bg-card text-foreground/80 hover:text-foreground hover:border-primary/40"
                      : "border-white/25 bg-white/10 text-white hover:bg-white/20"
                  )}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        className={heroSectionClass}
        style={{
          background: "linear-gradient(180deg, hsl(var(--primary)) 0%, hsl(215 92% 62%) 55%, hsl(207 95% 60%) 100%)",
          minHeight: `calc(100svh - ${headerHeight}px)`
        }}
        ref={el => sectionRefs.current['hero'] = el}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--primary)_/_0.18),hsl(var(--primary)_/_0.1),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)_/_0.18),transparent_38%),radial-gradient(circle_at_80%_15%,hsl(var(--primary)_/_0.12),transparent_32%)]" />

        <div className={`relative mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-14 ${fadeInUpClass('hero')}`}>
          <div className="grid lg:grid-cols-[1.05fr_1fr] items-center gap-14 lg:gap-24">
            {/* Chat preview mock (desktop only) */}
            <div className="hidden lg:block">
              <div className="relative mx-auto w-full max-w-xl rounded-[30px] bg-white/95 shadow-[0_30px_120px_-40px_rgba(0,0,0,0.45)] border border-white/70 backdrop-blur">
                <div className="flex items-center gap-2 px-6 py-4">
                  {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                    <span
                      key={i}
                      className="h-3 w-3 rounded-full"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <div className="px-6 pb-8">
                  <div className="flex items-center gap-3 rounded-full border border-gray-200/80 bg-white/70 px-5 py-3 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.35)]">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#8b8bff] via-[#7be1ff] to-[#5dc3ff] shadow-inner" />
                    <p className="text-sm text-gray-500">Start typing to ask or search</p>
                  </div>

                  <div className="mt-6 space-y-6">
                    {chatPreviewMessages.map((msg, idx) => (
                      <div key={idx} className="flex items-center gap-4 border-t border-gray-100 pt-5 first:border-t-0 first:pt-0">
                        <div className="w-12 text-right text-xs font-medium text-gray-400">{msg.time}</div>
                        <div className="flex-1 flex items-center gap-3">
                          <img
                            src={msg.avatar}
                            alt={msg.name}
                            className="h-10 w-10 rounded-full object-cover border border-white/60 shadow-sm"
                            loading="lazy"
                          />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{msg.name}</p>
                            <p className="text-sm text-gray-500 mt-0.5 leading-snug">{msg.text}</p>
                          </div>
                        </div>
                        <div
                          className="h-10 w-10 rounded-full flex items-center justify-center shadow-sm ring-1 ring-black/5"
                          style={{ background: msg.bg, color: msg.color }}
                        >
                          <msg.icon className="h-5 w-5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero copy */}
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start">
              <Badge
                variant="outline"
                className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 px-6 py-2 text-sm font-semibold text-white backdrop-blur"
              >
                <Sparkles className="h-4 w-4 ml-2" />
                {t("landing_hero_badge")}
              </Badge>

              <h1
                className="relative inline-block text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white"
              >
                <span className="block text-white">
                  {t("landing_hero_title_line1")}
                </span>
                <span className="block text-white">
                  {t("landing_hero_title_line2")}
                </span>
                <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0))]"></span>
              </h1>

              <p className="mx-auto lg:mx-0 mt-8 max-w-xl text-base sm:text-xl text-white/90 leading-relaxed">
                {t("landing_hero_subtitle")}
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 w-full">
                <Link
                  to="/signup"
                  className="group relative w-full sm:w-auto rounded-full bg-white text-primary px-6 sm:px-9 py-3.5 sm:py-4 text-base sm:text-lg font-bold shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_22px_70px_-10px_rgba(0,0,0,0.4)] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {t("landing_hero_cta_primary")}
                    <ArrowLeft className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>

                <a
                  href="#demo"
                  className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/30 bg-white/20 backdrop-blur px-6 sm:px-9 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-105 hover:bg-white/30 hover:shadow-[0_16px_50px_-10px_rgba(0,0,0,0.45)]"
                >
                  <Play className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                  <span>{t("landing_hero_cta_secondary")}</span>
                </a>
              </div>

              {/* Social Proof */}
              <div className="mt-12 flex flex-wrap justify-center lg:justify-start gap-6 text-white/85">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="w-9 h-9 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center backdrop-blur">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                    ))}
                  </div>
                  <span className="text-sm">
                    {t("landing_social_proof_clinics")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-sm">
                    {t("landing_social_proof_rating")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className={cn(sectionRegularClass)} ref={el => sectionRefs.current['how'] = el}>
        <div className={`mx-auto max-w-[96rem] px-4 ${fadeInUpClass('how')}`}>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 bg-primary/10">
              {t("landing_how_badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_how_title")}</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {t("landing_how_subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: t("landing_how_step1_title"),
                desc: t("landing_how_step1_desc"),
                stats: t("landing_how_step1_stats")
              },
              {
                icon: Zap,
                title: t("landing_how_step2_title"),
                desc: t("landing_how_step2_desc"),
                stats: t("landing_how_step2_stats")
              },
              {
                icon: Rocket,
                title: t("landing_how_step3_title"),
                desc: t("landing_how_step3_desc"),
                stats: t("landing_how_step3_stats")
              }
            ].map((step, i) => (
              <Card key={i} className="relative border-2 hover:border-primary/20 transition-all hover:shadow-xl">
                <CardContent className="pt-8 pb-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground mb-4">{step.desc}</p>
                  <Badge variant="secondary" className="bg-primary/5">
                    {step.stats}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* Demo Section */}
      <section id="demo" className={cn(sectionTallClass, "bg-muted/30")} ref={el => sectionRefs.current['demo'] = el}>
        <div className={`mx-auto max-w-[96rem] px-4 ${fadeInUpClass('demo')}`}>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 bg-primary/10">
              <Rocket className="h-4 w-4 ml-2" />
              {t("landing_demo_badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_demo_title")}</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {t("landing_demo_subtitle")}
            </p>
          </div>

          <div className="space-y-10">
            <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10">
              {/* Demo Controls */}
              <div className="space-y-6">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    {t("landing_demo_process_title")}
                  </h3>

                  <div className="space-y-4">
                    {demoScenarios[0].steps.map((step, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-xl transition-all",
                          index === currentStep ? "bg-primary/10 border border-primary/20" : "opacity-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                          index === currentStep ? "bg-primary text-white" : "bg-muted"
                        )}>
                          <step.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{step.message}</p>
                          {index === currentStep && (
                            <Progress value={(index + 1) * (100 / demoScenarios[0].steps.length)} className="h-1 mt-2" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <Button
                      onClick={startChatAnimation}
                      className="flex-1 rounded-xl"
                      disabled={isPlaying}
                    >
                      <Play className="h-4 w-4 ml-2" />
                      {t("landing_demo_play")}
                    </Button>
                    <Button
                      onClick={resetAnimation}
                      variant="outline"
                      className="rounded-xl"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              </div>

              {/* Chat Mockups */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Old Client Chat */}
                <div className="relative w-full max-w-[320px] mx-auto rounded-[32px] bg-black shadow-[0_25px_90px_-35px_rgba(0,0,0,0.6)] p-1">
                  <div className="flex flex-col h-[570px] rounded-[26px] overflow-hidden bg-[#e5ddd5]">
                    {/* Top bar */}
                    <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="text-sm font-semibold">{t("landing_chat_old_header_title")}</p>
                        <p className="text-[11px] text-white/80">{t("landing_chat_old_header_subtitle")}</p>
                      </div>
                      <div className="flex items-center gap-3 text-white/85">
                        <Video className="h-4 w-4" />
                        <PhoneCall className="h-4 w-4" />
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto custom-scroll">
                      {chatMessages.old.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex",
                            msg.type === 'sent'
                              ? (language === 'he' ? 'justify-start' : 'justify-end')
                              : (language === 'he' ? 'justify-end' : 'justify-start')
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                              msg.type === 'sent'
                                ? 'bg-[#d9fdd3] text-[#111827]'
                                : msg.type === 'system'
                                  ? 'bg-yellow-100 text-yellow-800 text-xs text-center w-full'
                                  : 'bg-white text-[#111827]'
                            )}
                          >
                            {msg.text}
                            {msg.type !== 'system' && (
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.type === 'sent' && <MessageStatus status={msg.status} />}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatMessages.old.length > 0 && chatMessages.old.length < oldClientMessages.length && (
                        <div className="flex justify-end">
                          <TypingIndicator />
                        </div>
                      )}
                    </div>
                    {/* Input */}
                    <div className="bg-white/95 border-t border-black/5 px-3 py-1.5 flex items-center gap-2">
                      <Smile className="h-5 w-5 text-gray-500" />
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <input
                        disabled
                        className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        placeholder={t("landing_chat_old_header_subtitle")}
                      />
                      <Send className="h-5 w-5 text-[#25D366]" />
                    </div>
                  </div>
                </div>

                {/* New Client Chat */}
                <div className="relative w-full max-w-[320px] mx-auto rounded-[32px] bg-black shadow-[0_25px_90px_-35px_rgba(0,0,0,0.6)] p-1">
                  <div className="flex flex-col h-[570px] rounded-[26px] overflow-hidden bg-[#e5ddd5]">
                    <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Rocket className="h-4 w-4" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="text-sm font-semibold">{t("landing_chat_new_header_title")}</p>
                        <p className="text-[11px] text-white/80">{t("landing_chat_new_header_subtitle")}</p>
                      </div>
                      <div className="flex items-center gap-3 text-white/85">
                        <Video className="h-4 w-4" />
                        <PhoneCall className="h-4 w-4" />
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto custom-scroll">
                      {chatMessages.new.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex",
                            msg.type === 'sent'
                              ? (language === 'he' ? 'justify-start' : 'justify-end')
                              : (language === 'he' ? 'justify-end' : 'justify-start')
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[78%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                              msg.type === 'sent'
                                ? 'bg-[#d9fdd3] text-[#111827]'
                                : msg.type === 'system'
                                  ? 'bg-blue-100 text-blue-800 text-xs text-center w-full'
                                  : 'bg-white text-[#111827]'
                            )}
                          >
                            {msg.text}
                            {msg.type !== 'system' && (
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {msg.type === 'sent' && <MessageStatus status={msg.status} />}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {chatMessages.new.length > 0 && chatMessages.new.length < newClientMessages.length && (
                        <div className="flex justify-end">
                          <TypingIndicator />
                        </div>
                      )}
                    </div>
                    <div className="bg-white/95 border-t border-black/5 px-3 py-1.5 flex items-center gap-2">
                      <Smile className="h-5 w-5 text-gray-500" />
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <input
                        disabled
                        className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        placeholder={t("landing_chat_new_header_subtitle")}
                      />
                      <Send className="h-5 w-5 text-[#25D366]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-2">
              <CardContent className="p-6">
                <h4 className="font-bold mb-3">{t("landing_demo_realtime_title")}</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("landing_demo_realtime_identified")}</span>
                    <Badge>3</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("landing_demo_realtime_sent")}</span>
                    <Badge variant="secondary">5</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("landing_demo_realtime_replies")}</span>
                    <Badge className="bg-success">2</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t("landing_demo_realtime_revenue")}</span>
                    <span className="font-bold text-success">₪1,200</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </section>

      {/* Results Section */}
      <section id="results" className={cn(sectionRegularClass)} ref={el => sectionRefs.current['results'] = el}>
        <div className={`mx-auto max-w-[96rem] px-4 ${fadeInUpClass('results')}`}>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 bg-success/10 text-success">
              <Target className="h-4 w-4 ml-2" />
              {t("landing_results_badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_results_title")}</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {t("landing_results_subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                  <Award className="h-8 w-8 text-success" />
                </div>
                <div className="text-4xl font-bold text-success mb-2">
                  <CountUpValue target={78} isActive={isResultsVisible} suffix="%" locale={numberLocale} />
                </div>
                <p className="font-semibold">{t("landing_results_card1_title")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("landing_results_card1_subtitle")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <div className="text-4xl font-bold text-primary mb-2">
                  <CountUpValue target={45} isActive={isResultsVisible} prefix={shekelPrefix} suffix="K" locale={numberLocale} />
                </div>
                <p className="font-semibold">{t("landing_results_card2_title")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("landing_results_card2_subtitle")}
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-warning" />
                </div>
                <div className="text-4xl font-bold text-warning mb-2">
                  <CountUpValue target={8} isActive={isResultsVisible} suffix="h" locale={numberLocale} />
                </div>
                <p className="font-semibold">{t("landing_results_card3_title")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("landing_results_card3_subtitle")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={cn(sectionRegularClass, "bg-muted/30")} ref={el => sectionRefs.current['pricing'] = el}>
        <div className="mx-auto max-w-[96rem] px-4">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 bg-primary/10">
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">Choose the plan that fits your clinic</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Start free, scale when you’re ready. All plans include secure WhatsApp automation, smart follow-ups, and analytics.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[ 
              {
                id: "starter",
                title: t("plan_starter"),
                price: "$0",
                limit: t("landing_pricing_starter_limit"),
                features: [
                  t("landing_pricing_starter_feature_inbox"),
                  t("landing_pricing_starter_feature_reminders"),
                  t("landing_pricing_starter_feature_email_support"),
                  t("landing_pricing_starter_feature_landing_form"),
                ],
                button: t("landing_pricing_starter_cta"),
                variant: "outline",
                highlight: false,
                style: "border-2 shadow-card-hover",
              },
              {
                id: "growth",
                title: t("plan_growth"),
                price: "$49",
                limit: t("landing_pricing_growth_limit"),
                features: [
                  t("landing_pricing_growth_feature_whatsapp_templates"),
                  t("landing_pricing_growth_feature_lead_scoring"),
                  t("landing_pricing_growth_feature_two_way"),
                  t("landing_pricing_growth_feature_custom_landing"),
                  t("landing_pricing_growth_feature_team_inbox"),
                  t("landing_pricing_growth_feature_priority_chat"),
                ],
                button: t("landing_pricing_growth_cta"),
                variant: "primary",
                highlight: true,
                style: "border-2 border-primary shadow-card-hover",
              },
              {
                id: "scale",
                title: t("plan_scale"),
                price: "$129",
                limit: t("landing_pricing_scale_limit"),
                features: [
                  t("landing_pricing_scale_feature_automations"),
                  t("landing_pricing_scale_feature_api"),
                  t("landing_pricing_scale_feature_success_manager"),
                  t("landing_pricing_scale_feature_reporting"),
                  t("landing_pricing_scale_feature_sla"),
                ],
                button: t("landing_pricing_scale_cta"),
                variant: "outline",
                highlight: false,
                style: "border-2 shadow-card-hover",
              },
            ].map((plan) => (
              <Card key={plan.id} className={cn("h-full relative rounded-3xl transition-all duration-300", plan.style)}>
                <CardContent className="p-7 h-full flex flex-col gap-6">
                  {plan.highlight && (
                    <div className="absolute right-6 top-6 rounded-full bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-sm">
                      {t("most_popular")}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-primary">{plan.title}</p>
                    <p className="text-4xl font-bold mt-2">{plan.price}</p>
                    <p className="text-sm text-muted-foreground">{plan.limit}</p>
                  </div>
                  <div className="space-y-3 text-sm text-foreground flex-1">
                    {plan.features.map((feature, index) => (
                      <div key={feature + index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-success mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                    <Link to="/dashboard" className="block mt-auto">
                      <Button
                        className={cn("w-full rounded-full text-base transition-all duration-200", plan.variant === "primary"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-primary/20 bg-card text-foreground/80 hover:text-foreground hover:border-primary/50")}
                        size="lg"
                      >
                        {plan.button}
                      </Button>
                    </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 space-y-4 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card/60 to-primary/10 p-8 text-center shadow-xl shadow-primary/20">
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("landing_pricing_contact_cta")}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/90 px-10 py-3 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:shadow-primary/60"
            >
              {t("contact_us")}
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className={cn(sectionRegularClass)} ref={el => sectionRefs.current['faq'] = el}>
        <div className={`mx-auto max-w-[96rem] px-4 ${fadeInUpClass('faq')}`}>
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 px-4 py-2 bg-primary/10">
              <MessageCircle className="h-4 w-4 ml-2" />
              {t("landing_faq_badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_faq_title")}</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {t("landing_faq_subtitle")}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden border border-primary/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-7 sm:p-8 space-y-6">
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold leading-tight">
                    {t("landing_faq_side_title")}
                  </h3>
                  <p className="text-sm text-primary-foreground/85">
                    {t("landing_faq_side_subtitle")}
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-3">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{t("landing_faq_side_point1")}</span>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-3">
                    <Shield className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{t("landing_faq_side_point2")}</span>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl border border-white/20 bg-white/10 p-3">
                    <Users className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{t("landing_faq_side_point3")}</span>
                  </div>
                </div>

                <Link to="/signup" className="block">
                  <Button className="w-full rounded-full bg-white text-primary hover:bg-white/90">
                    {t("landing_cta_start_trial")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-border shadow-card">
              <CardContent className="p-4 sm:p-6">
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, index) => (
                    <AccordionItem key={index} value={`faq-item-${index}`} className="border-border">
                      <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm leading-7 text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 bg-gradient-to-br from-[#050c2a] via-[#09124f] to-[#0f1b5c] text-white">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/40 to-transparent blur-3xl" />
        <div className="relative mx-auto max-w-[96rem] px-4 py-12 space-y-10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr_1fr]">
            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.4em] text-primary/80">{t("landing_footer_cta_tag")}</p>
              <h3 className="text-3xl font-bold leading-tight">{t("landing_footer_cta_title")}</h3>
              <p className="text-sm text-white/80 max-w-xl">{t("landing_footer_cta_subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary transition hover:bg-white/90"
                >
                  {t("landing_footer_cta_button")}
                </Link>
                <Link
                  to="/demo"
                  className="inline-flex items-center justify-center rounded-full border border-white/50 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white/90 transition hover:border-white hover:text-white"
                >
                  {t("landing_footer_cta_secondary")}
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
                <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("landing_footer_phone_label")}</p>
                  <p className="font-semibold">{t("landing_footer_contact_phone")}</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{t("landing_footer_email_label")}</p>
                  <p className="font-semibold">{t("landing_footer_contact_email")}</p>
                </div>
              </div>
              <p className="text-xs text-white/60">{t("landing_footer_cta_note")}</p>
            </div>

            <div className="grid gap-6">
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">{t("landing_footer_product_title")}</h4>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li><a href="#features" className="hover:text-white">{t("landing_footer_product_features")}</a></li>
                  <li><a href="#pricing" className="hover:text-white">{t("landing_footer_product_pricing")}</a></li>
                  <li><a href="#demo" className="hover:text-white">{t("landing_footer_product_demo")}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">{t("landing_footer_company_title")}</h4>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li><a href="#about" className="hover:text-white">{t("landing_footer_company_about")}</a></li>
                  <li><a href="#blog" className="hover:text-white">{t("landing_footer_company_blog")}</a></li>
                  <li><a href="#contact" className="hover:text-white">{t("landing_footer_company_contact")}</a></li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">{t("landing_footer_contact_title")}</h4>
              <ul className="space-y-3 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>{t("landing_footer_contact_phone")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-primary" />
                  <span>{t("landing_footer_contact_email")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span>{t("landing_footer_contact_address")}</span>
                </li>
              </ul>
              <div className="space-y-2 text-xs uppercase tracking-[0.4em] text-white/50">
                <p>{t("landing_footer_social_tag")}</p>
                <p className="text-white/60">{t("landing_footer_follow_us")}</p>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <a href="https://www.instagram.com" className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white hover:text-white" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="https://www.linkedin.com" className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white hover:text-white" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="mailto:hello@clinicgrowth.com" className="rounded-full border border-white/20 p-2 text-white/70 transition hover:border-white hover:text-white" aria-label="Email">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 text-center text-xs uppercase tracking-[0.4em] text-white/70">
            <p>{t("landing_footer_copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
