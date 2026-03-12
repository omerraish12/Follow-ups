// src/pages/LandingPage.tsx
import {
  Phone, DollarSign, Clock, MessageSquare, Users, Zap,
  BarChart3, Shield, ChevronLeft, Star, CheckCircle,
  ArrowLeft, Sparkles, Rocket, Target, HeartHandshake,
  Calendar, MessageCircle,
  Award, Download, Play, Pause,
  PhoneCall, Video, MoreVertical, Send, Smile, Paperclip,
  Badge
} from "lucide-react";
import { Grid, Instagram, Linkedin, Mail, Slack } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import LogoMark from "@/assets/followup-logo-light.svg";
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
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(76);
  const sectionRefs = useRef({});
  const navRef = useRef<HTMLElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const hasAutoPlayedDemoRef = useRef(false);
  const chatPreviewMessages = useMemo(
    () => [
      { time: "2m", name: "Lior Day Spa", text: t("landing_hero_chat_msg1"), avatar: "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=80&q=80", icon: Grid, bg: "#f26a8a", color: "#ffffff" },
      { time: "5m", name: "Maya Brows", text: t("landing_hero_chat_msg2"), avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=80&q=80", icon: MessageCircle, bg: "#70d7b4", color: "#0f1417" },
      { time: "8m", name: "Dr. Eden", text: t("landing_hero_chat_msg3"), avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80", icon: Mail, bg: "#0f1518", color: "#fefefe" },
      { time: "12m", name: "Glow Hair Studio", text: t("landing_hero_chat_msg4"), avatar: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=80&q=80", icon: Instagram, bg: "#f6b76c", color: "#1c0f15" },
      { time: "15m", name: "Orly Aesthetics", text: t("landing_hero_chat_msg5"), avatar: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=80&q=80", icon: Linkedin, bg: "#1b1f1d", color: "#ffffff" },
      { time: "18m", name: "Shira Studio", text: t("landing_hero_chat_msg6"), avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=80&q=80", icon: Slack, bg: "#f2d6ca", color: "#1b0f16" },
    ],
    [t, language]
  );

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

  // Demo chat scripts — switch language based on current locale
  const oldClientMessages = useMemo(() => (
    language === 'he'
      ? [
          { id: 1, type: 'note', text: "לפני 14 ימים", delay: 200 },
          { id: 2, type: 'received', text: "אוקיי אני אחשוב על זה...", time: "", delay: 400, status: 'sent' },
          { id: 3, type: 'sent', text: "שלום יעל! רצינו לבדוק אם את עדיין מעוניינת בהצעה שלנו 😊", time: "היום 14:32", delay: 800, status: 'sent' },
          { id: 4, type: 'received', text: "שכחתי מזה לגמרי, אני מעוניינת. מה הצעד הבא?", time: "היום 14:45", delay: 2200, status: 'sent' },
          { id: 5, type: 'sent', text: "מעולה! אפשר לקבוע תור כאן:\n✅ https://cal.com/meeting", time: "היום 14:46", delay: 3700, status: 'delivered' },
          { id: 6, type: 'received', text: "סיימתי, הזמנתי תור.", time: "היום 15:12", delay: 5200, status: 'read' },
          { id: 7, type: 'cta', text: "לקוח חוזר! 🔥", delay: 7000 },
        ]
      : [
          { id: 1, type: 'note', text: "14 days ago", delay: 200 },
          { id: 2, type: 'received', text: "Ok, I'll think about it...", time: "", delay: 400, status: 'sent' },
          { id: 3, type: 'sent', text: "Hey Yael! Wanted to check if you're still interested in our offer 😊", time: "Today 2:32 PM", delay: 800, status: 'sent' },
          { id: 4, type: 'received', text: "I totally forgot, yes I'm interested. What’s next?", time: "Today 2:45 PM", delay: 2200, status: 'sent' },
          { id: 5, type: 'sent', text: "Great! You can book a slot here:\n✅ https://cal.com/meeting", time: "Today 2:46 PM", delay: 3700, status: 'delivered' },
          { id: 6, type: 'received', text: "Done, booked a slot.", time: "Today 3:12 PM", delay: 5200, status: 'read' },
          { id: 7, type: 'cta', text: "Returning customer! 🔥", delay: 7000 },
        ]
  ), [language]);

  const newClientMessages = useMemo(() => (
    language === 'he'
      ? [
          { id: 1, type: 'received', text: "שלום, אני מחפש טיפול פנים בתל אביב", time: "היום 10:15", delay: 500, status: 'sent' },
          { id: 2, type: 'sent', text: "שלום! אנחנו עסק לטיפולי פנים בתל אביב. אני אשמח להסביר על השירותים שלנו 😊", time: "היום 10:16", delay: 2000, status: 'sent' },
          { id: 3, type: 'sent', text: "אילו טיפולים מעניינים אותך? אנו מציעים טיפול פנים מתקדמים עם תוצאות מהירות ✨", time: "היום 10:16", delay: 3500, status: 'delivered' },
          { id: 4, type: 'received', text: "מעוניין לדעת עוד על טיפול אנטי-אייג'ינג.", time: "היום 10:20", delay: 5000, status: 'sent' },
          { id: 5, type: 'cta', text: "לקוח חדש 🔥", delay: 6800 },
        ]
      : [
          { id: 1, type: 'received', text: "Hi, I'm looking for a facial treatment in Tel Aviv", time: "Today 10:15 AM", delay: 500, status: 'sent' },
          { id: 2, type: 'sent', text: "Hi! We’re a facial clinic in Tel Aviv. Happy to explain our services 😊", time: "Today 10:16 AM", delay: 2000, status: 'sent' },
          { id: 3, type: 'sent', text: "Which treatments interest you? We offer advanced facials with fast results ✨", time: "Today 10:16 AM", delay: 3500, status: 'delivered' },
          { id: 4, type: 'received', text: "Interested in more info on anti-aging treatment.", time: "Today 10:20 AM", delay: 5000, status: 'sent' },
          { id: 5, type: 'cta', text: "New customer! 🔥", delay: 6800 },
        ]
  ), [language]);

  useEffect(() => {
    const initialTheme = resolvedTheme || theme || "dark";
    setTheme("dark");
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

  // When language changes and chats were already played, rehydrate messages with current locale
  useEffect(() => {
    if (chatMessages.old.length || chatMessages.new.length) {
      clearChatTimers();
      setChatMessages({
        old: oldClientMessages,
        new: newClientMessages
      });
      setActiveChat('both');
      setIsPlaying(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const clearChatTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const startChatAnimation = () => {
    clearChatTimers();
    setChatMessages({ old: [], new: [] });
    setActiveChat('both');
    setIsPlaying(true);

    const messageDurations: number[] = [];

    oldClientMessages.forEach((msg) => {
      messageDurations.push(msg.delay);
      const id = window.setTimeout(() => {
        setChatMessages(prev => ({
          ...prev,
          old: [...prev.old, msg]
        }));
      }, msg.delay);
      timersRef.current.push(id);
    });

    newClientMessages.forEach((msg) => {
      messageDurations.push(msg.delay);
      const id = window.setTimeout(() => {
        setChatMessages(prev => ({
          ...prev,
          new: [...prev.new, msg]
        }));
      }, msg.delay);
      timersRef.current.push(id);
    });

    const completionDelay = Math.max(...messageDurations, 0) + 800;
    const completionId = window.setTimeout(() => {
      setIsPlaying(false);
    }, completionDelay);
    timersRef.current.push(completionId);
  };

  useEffect(() => {
    if (
      isVisible["demo"] &&
      !hasAutoPlayedDemoRef.current &&
      !isPlaying &&
      chatMessages.old.length === 0 &&
      chatMessages.new.length === 0
    ) {
      hasAutoPlayedDemoRef.current = true;
      startChatAnimation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, isPlaying, chatMessages.old.length, chatMessages.new.length]);

  useEffect(() => () => clearChatTimers(), []);

  const fadeInUpClass = (section) =>
    `transition-all duration-1000 transform ${isVisible[section]
      ? 'opacity-100 translate-y-0'
      : 'opacity-0 translate-y-10'
    }`;

  const MessageStatus = ({ status }) => {
    switch (status) {
      case 'sent':
        return <span className="text-[10px] text-muted-foreground mr-1">✓</span>;
      case 'delivered':
        return <span className="text-[10px] text-muted-foreground mr-1">✓✓</span>;
      case 'read':
        return <span className="text-[10px] text-primary mr-1">✓✓</span>;
      default:
        return null;
    }
  };

  const SafariChrome = () => (
    <div className="bg-[#f3f3f3] text-[#111] px-4 py-2 flex items-center justify-between text-xs border-b border-black/5">
      <span>9:38</span>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full inline-block"></span>
        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full inline-block"></span>
        <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
      </div>
      <span>4G 81%</span>
    </div>
  );

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
      ? "text-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] hover:text-[#ffd7c2]"
      : "text-white drop-shadow-[0_2px_8px_rgba(14,10,14,0.35)]"
  );

  const navBaseClass = "sticky top-0 z-50 transition-all duration-300";
  const navDefaultClass = "bg-transparent text-white border-none shadow-none";
  const navScrolledVisualClass =
    "bg-gradient-to-b from-[#1b0f16]/95 via-[#161a16]/92 to-[#0f1215]/95 border-b border-white/10 text-white shadow-[0_10px_35px_rgba(17,9,12,0.55)] supports-[backdrop-filter]:backdrop-blur-lg backdrop-blur-lg";
  const navActionPanelClass = cn(
    "flex items-center gap-3 transition-all duration-300"
  );
  const navLogoClass = cn(
    "text-3xl sm:text-4xl font-display font-extrabold tracking-[0.08em] uppercase leading-tight transition-colors duration-200 text-white"
  );
  const navLanguageClass = cn(
    "flex h-11 w-11 items-center justify-center rounded-full border text-[11px] font-semibold tracking-[0.35em] uppercase transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 shadow-[0_10px_30px_-18px_rgba(17,10,14,0.4)]",
    isNavScrolled
      ? "border-white/25 bg-white/12 text-white hover:bg-white/20"
      : "border-white/30 bg-white/15 text-white hover:bg-white/22"
  );
  const navLoginLinkClass = cn(
    "hidden sm:inline-flex items-center justify-center h-12 px-6 rounded-full text-sm font-semibold transition-all duration-300 border border-white/45 text-white bg-white/10 hover:bg-white/18 hover:border-white/60 hover:scale-[1.01] shadow-none"
  );
  const startNowButtonClass = cn(
    "inline-flex h-12 items-center justify-center rounded-full px-7 py-2.5 text-sm font-semibold transition-all duration-300 shadow-[0_22px_55px_-18px_rgba(17,10,14,0.55)] bg-gradient-to-r from-primary via-[#f38fb0] to-[#70d7b4] text-white hover:scale-[1.02]"
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
      </div>

      {/* Navbar */}
      <nav ref={navRef} className={cn(navBaseClass, isNavScrolled ? navScrolledVisualClass : navDefaultClass)}>
        <div className="mx-auto flex max-w-[96rem] items-center justify-between px-4 py-2 sm:py-3">
          <div className="relative flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur">
              <img src={LogoMark} alt="Clinic Growth Hub symbol" className="h-full w-full" />
            </div>
            <span className={navLogoClass}>
              {t("app_title")}
            </span>
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

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleLanguage}
                  aria-label={`Switch language (current ${languageCode})`}
                  className={navLanguageClass}
                >
                  <span className="text-[11px]">{languageCode}</span>
                </button>
                <Link
                  to="/dashboard"
                  className={cn(
                    "hidden sm:flex flex-col leading-tight text-left text-sm transition-colors duration-200 text-white hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.35em]",
                      "text-white/70"
                    )}
                  >
                    {t("landing_nav_signed_in_as")}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      "text-white"
                    )}
                  >
                    {userDisplayName || t("landing_nav_dashboard")}
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleLanguage}
                    aria-label={`Switch language (current ${languageCode})`}
                    className={navLanguageClass}
                  >
                    <span className="text-[11px]">{languageCode}</span>
                  </button>
                  <div className={navActionPanelClass}>
                    <Link to="/login" className={navLoginLinkClass}>
                      {t("landing_nav_login")}
                    </Link>
                  </div>
                </div>
                <Link to="/signup" className={startNowButtonClass}>
                  {t("landing_nav_start_now")}
                </Link>
              </>
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
          background: "radial-gradient(circle at 12% 20%, rgba(244,147,183,0.32), transparent 40%), radial-gradient(circle at 82% 16%, rgba(122,214,183,0.26), transparent 38%), linear-gradient(160deg, #150d13 0%, #0f1215 55%, #0f1417 100%)",
          minHeight: "100svh",
          marginTop: `-${headerHeight}px`,
          paddingTop: `${headerHeight}px`
        }}
        ref={el => sectionRefs.current['hero'] = el}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(21,10,20,0.35),rgba(19,15,19,0.2),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(242,106,138,0.24),transparent_42%),radial-gradient(circle_at_84%_18%,rgba(111,207,178,0.2),transparent_36%)]" />

        <div className={`relative mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-14 ${fadeInUpClass('hero')}`}>
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] items-center gap-12 lg:gap-20">
            {/* Chat preview mock (desktop only) */}
            <div className="hidden lg:flex">
              <div className="relative mx-auto w-full max-w-[38rem] rounded-[32px] bg-white/95 shadow-[0_40px_120px_-40px_rgba(20,12,18,0.55)] border border-white/70 backdrop-blur">
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
                  <div className="flex items-center gap-3 rounded-full border border-gray-200/80 bg-white/70 px-5 py-3 shadow-[0_18px_50px_-24px_rgba(21,12,16,0.28)]">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#f26a8a] via-[#f6b76c] to-[#70d7b4] shadow-inner" />
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
            <div className="text-center lg:text-left flex flex-col items-center lg:items-start space-y-6">
              <Badge
                variant="outline"
                className="mb-6 inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/15 px-6 py-2 text-sm font-semibold text-white backdrop-blur"
              >
                <Sparkles className="h-4 w-4 ml-2" />
                {t("landing_hero_badge")}
              </Badge>

              <h1
                className="relative inline-block text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-white max-w-[20ch]"
              >
                <span className="block text-white">
                  {t("landing_hero_title_line1")}
                </span>
                <span className="block text-white">
                  {t("landing_hero_title_line2")}
                </span>
                <span className="pointer-events-none absolute -bottom-4 left-1/2 -translate-x-1/2 w-full h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.9),rgba(255,255,255,0))]"></span>
              </h1>

              <p className="mx-auto lg:mx-0 mt-2 max-w-2xl text-base sm:text-xl text-white/90 leading-relaxed">
                {t("landing_hero_subtitle")}
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 w-full">
                <Link
                  to="/signup"
                  className="group relative w-full sm:w-auto rounded-full bg-gradient-to-r from-[#f26a8a] via-[#f6b76c] to-[#70d7b4] text-white px-6 sm:px-9 py-3.5 sm:py-4 text-base sm:text-lg font-bold shadow-[0_20px_60px_-12px_rgba(21,12,16,0.4)] transition-all duration-300 hover:scale-105 hover:shadow-[0_22px_70px_-10px_rgba(21,12,16,0.45)] overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {t("landing_hero_cta_primary")}
                    <ArrowLeft className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>

                <a
                  href="#demo"
                  className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-white/30 bg-white/12 backdrop-blur px-6 sm:px-9 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-white shadow-[0_12px_40px_-12px_rgba(17,10,14,0.4)] transition-all duration-300 hover:scale-105 hover:bg-white/18 hover:shadow-[0_16px_50px_-10px_rgba(17,10,14,0.45)]"
                >
                  <Play className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
                  <span>{t("landing_hero_cta_secondary")}</span>
                </a>
              </div>

              {/* Social Proof */}
              <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-6 text-white/85">
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
            <div className="flex justify-center">
              <div className="grid sm:grid-cols-2 gap-6 max-w-5xl w-full">
                {/* Old Client Chat */}
                <div className="relative w-full max-w-[320px] mx-auto rounded-[32px] bg-black shadow-[0_25px_90px_-35px_rgba(0,0,0,0.6)] p-1">
                  <div className="flex flex-col h-[620px] rounded-[26px] overflow-hidden bg-[#e5ddd5]" dir={language === 'he' ? 'rtl' : 'ltr'}>
                    <SafariChrome />
                    <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="text-sm font-semibold">ניהול לידים</p>
                        <p className="text-[11px] text-white/80">Lead Oscar Smith was created</p>
                      </div>
                      <div className="flex items-center gap-3 text-white/85">
                        <Video className="h-4 w-4" />
                        <PhoneCall className="h-4 w-4" />
                        <MoreVertical className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 px-3 py-3 space-y-2 overflow-y-auto custom-scroll">
                      {chatMessages.old.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex",
                            msg.type === 'cta'
                              ? 'justify-center'
                              : msg.type === 'sent'
                                ? (language === 'he' ? 'justify-start' : 'justify-end')
                                : (language === 'he' ? 'justify-end' : 'justify-start')
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm",
                              msg.type === 'cta'
                                ? 'bg-gradient-to-r from-[#1fb05b] to-[#199d44] text-white font-bold text-center px-6 py-3 rounded-full shadow-[0_12px_30px_-12px_rgba(25,157,68,0.8)]'
                                : msg.type === 'note'
                                  ? 'bg-transparent text-[#c62828] text-[12px] font-semibold text-center shadow-none px-0 py-0'
                                : msg.type === 'sent'
                                  ? 'bg-[#dcf8c6] text-[#1f2a2e]'
                                : msg.type === 'system'
                                  ? 'bg-yellow-100 text-yellow-800 text-xs text-center w-full'
                                  : 'bg-white text-[#1f2a2e]'
                            )}
                            dir={language === 'he' ? 'rtl' : 'ltr'}
                          >
                            {msg.text}
                            {msg.type !== 'system' && msg.type !== 'cta' && msg.type !== 'note' && (
                              <div className="flex justify-end items-center gap-1 mt-1">
                                {msg.time && <span className="text-[10px] text-gray-500">{msg.time}</span>}
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
                    <div className="bg-white/95 border-t border-black/5 px-3 py-1.5 flex items-center gap-2">
                      <Smile className="h-5 w-5 text-gray-500" />
                      <Paperclip className="h-5 w-5 text-gray-500" />
                      <input
                        disabled
                        className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
                        placeholder={language === 'he' ? "הקלד/י הודעה" : "Type a message"}
                      />
                      <Send className="h-5 w-5 text-[#25D366]" />
                    </div>
                  </div>
                </div>

                {/* New Client Chat */}
                <div className="relative w-full max-w-[320px] mx-auto rounded-[32px] bg-black shadow-[0_25px_90px_-35px_rgba(0,0,0,0.6)] p-1">
                  <div className="flex flex-col h-[620px] rounded-[26px] overflow-hidden bg-[#e5ddd5]" dir={language === 'he' ? 'rtl' : 'ltr'}>
                    <SafariChrome />
                    <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Rocket className="h-4 w-4" />
                      </div>
                      <div className="flex-1 leading-tight">
                        <p className="text-sm font-semibold">דני לוי</p>
                        <p className="text-[11px] text-white/80">לקוח חדש</p>
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
                            msg.type === 'cta'
                              ? 'justify-center'
                              : msg.type === 'sent'
                                ? (language === 'he' ? 'justify-start' : 'justify-end')
                                : (language === 'he' ? 'justify-end' : 'justify-start')
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed shadow-sm",
                              msg.type === 'sent'
                                ? 'bg-[#dcf8c6] text-[#1f2a2e]'
                                : msg.type === 'system'
                                  ? 'bg-amber-50 text-amber-900 text-xs text-center w-full'
                                  : msg.type === 'cta'
                                    ? 'bg-gradient-to-r from-[#1fb05b] to-[#199d44] text-white font-bold text-center px-6 py-3 rounded-full shadow-[0_12px_30px_-12px_rgba(25,157,68,0.8)]'
                                  : 'bg-white text-[#1f2a2e]'
                            )}
                            dir={language === 'he' ? 'rtl' : 'ltr'}
                          >
                            {msg.text}
                            {msg.type !== 'system' && (
                              <div className="flex justify-end items-center gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {msg.time || new Date().toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
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
                        placeholder={language === 'he' ? "הקלד/י הודעה" : "Type a message"}
                      />
                      <Send className="h-5 w-5 text-[#25D366]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
              {t("landing_pricing_badge")}
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">{t("landing_pricing_title")}</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              {t("landing_pricing_subtitle")}
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
                style: "border-2",
              },
              {
                id: "growth",
                title: t("plan_growth"),
                price: "$49",
                limit: t("landing_pricing_growth_limit"),
                features: [
                  t("landing_pricing_growth_feature_whatsapp_templates"),
                  t("landing_pricing_growth_feature_followup_insights"),
                  t("landing_pricing_growth_feature_inbox_roles"),
                  t("landing_pricing_growth_feature_webhook_logs"),
                  t("landing_pricing_growth_feature_sandbox_tests"),
                  t("landing_pricing_growth_feature_reply_alerts"),
                ],
                button: t("landing_pricing_growth_cta"),
                variant: "primary",
                highlight: true,
                style: "border-2 border-primary",
              },
              {
                id: "scale",
                title: t("plan_scale"),
                price: "$129",
                limit: t("landing_pricing_scale_limit"),
                features: [
                  t("landing_pricing_scale_feature_automations"),
                  t("landing_pricing_scale_feature_api"),
                  t("landing_pricing_scale_feature_analytics"),
                  t("landing_pricing_scale_feature_backup_exports"),
                  t("landing_pricing_scale_feature_platform_admin"),
                ],
                button: t("landing_pricing_scale_cta"),
                variant: "outline",
                highlight: false,
                style: "border-2",
              },
            ].map((plan) => (
              <Card key={plan.id} className={cn("h-full relative rounded-3xl transition-all duration-300 shadow-none !shadow-none", plan.style)}>
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

          <div className="mt-12 space-y-4 rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-card/60 to-primary/10 p-8 text-center shadow-none !shadow-none">
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
              {t("landing_pricing_contact_cta")}
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/90 px-10 py-3 text-base font-semibold text-primary-foreground shadow-none hover:shadow-none transition"
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
      <footer className="relative overflow-hidden bg-gradient-to-br from-[#150d13] via-[#0f1215] to-[#0f1417] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(140%_140%_at_top_left,rgba(242,106,138,0.26),transparent_52%),radial-gradient(160%_160%_at_bottom_right,rgba(112,215,180,0.22),transparent_62%)]" />
        <div className="relative mx-auto max-w-[96rem] px-4 py-12">
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div className="space-y-4 rounded-[32px] border border-white/12 bg-white/8 p-6 sm:p-8 shadow-[0_25px_60px_rgba(17,10,14,0.6)] backdrop-blur">
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/60">{t("landing_footer_ready_tag")}</p>
              <h3 className="text-3xl font-display font-extrabold leading-tight text-white">{t("landing_footer_title")}</h3>
              <p className="text-sm text-white/80">{t("landing_footer_subtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="mailto:OMER.RAISH@GMAIL.COM?subject=Follow-ups%20Contact%20Request"
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#f26a8a] via-[#f6b76c] to-[#70d7b4] px-5 py-2 text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(17,10,14,0.55)] transition hover:scale-[1.02]"
                >
                  {t("landing_footer_cta_contact")}
                </a>
                <a
                  href="mailto:OMER.RAISH@GMAIL.COM?subject=Follow-ups%20Demo%20Request"
                  className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white/90 transition hover:border-white hover:bg-white/14"
                >
                  {t("landing_footer_cta_demo")}
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 text-sm text-white/80">
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">{t("landing_footer_contact_call")}</p>
                  <p className="font-semibold">{t("landing_footer_contact_phone")}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">{t("landing_footer_email_label")}</p>
                  <p className="font-semibold">{t("landing_footer_contact_email")}</p>
                </div>
              </div>
              <p className="text-xs text-white/60">{t("landing_footer_support_note")}</p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.35em] text-white/60">
                <span>{t("landing_footer_languages")}:</span>
                <div className="flex gap-2">
                  <span className="rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold">{t("english")}</span>
                  <span className="rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold">{t("hebrew")}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("landing_footer_product_title")}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  <li><a href="#features" className="transition hover:text-white">{t("landing_footer_product_features")}</a></li>
                  <li><a href="#pricing" className="transition hover:text-white">{t("landing_footer_product_pricing")}</a></li>
                  <li><a href="#demo" className="transition hover:text-white">{t("landing_footer_product_demo")}</a></li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/12 bg-white/8 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("landing_footer_company_title")}</p>
                <ul className="mt-3 space-y-2 text-sm text-white/80">
                  <li><a href="#about" className="transition hover:text-white">{t("landing_footer_company_about")}</a></li>
                  <li><a href="#blog" className="transition hover:text-white">{t("landing_footer_company_blog")}</a></li>
                  <li><a href="#contact" className="transition hover:text-white">{t("landing_footer_company_contact")}</a></li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-white/12 bg-white/8 p-4 sm:p-5 text-sm text-white/80 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{t("landing_footer_contact_title")}</p>
                <p className="text-sm text-white/70">{t("landing_footer_contact_description")}</p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-white">
                  <Phone className="h-5 w-5 text-primary" />
                  <a href="tel:+97231234567" className="font-semibold transition hover:text-white">
                    {t("landing_footer_contact_phone")}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Mail className="h-5 w-5 text-primary" />
                  <a href="mailto:OMER.RAISH@GMAIL.COM?subject=Follow-ups%20Inquiry" className="font-semibold transition hover:text-white">
                    {t("landing_footer_contact_email")}
                  </a>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <Users className="h-5 w-5 text-primary" />
                  <a
                    href="https://maps.google.com/?q=12+Herzl+St+Tel+Aviv"
                    className="font-semibold transition hover:text-white"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("landing_footer_contact_address")}
                  </a>
                </li>
              </ul>
              <div className="text-xs uppercase tracking-[0.4em] text-white/60">
                <p>{t("landing_footer_social_tag")}</p>
                <p className="text-white/50">{t("landing_footer_follow_us")}</p>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <a href="https://www.instagram.com" className="rounded-full border border-white/20 p-2 transition hover:border-white hover:text-white" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
                <a href="https://www.linkedin.com" className="rounded-full border border-white/20 p-2 transition hover:border-white hover:text-white" aria-label="LinkedIn">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="mailto:hello@clinicgrowth.com" className="rounded-full border border-white/20 p-2 transition hover:border-white hover:text-white" aria-label="Email">
                  <Mail className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs uppercase tracking-[0.35em] text-white/60">
            <p>{t("landing_footer_copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
