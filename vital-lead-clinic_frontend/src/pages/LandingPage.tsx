// src/pages/LandingPage.tsx
import {
  Phone, DollarSign, Clock, MessageSquare, Users, Zap,
  BarChart3, Shield, ChevronLeft, Star, CheckCircle,
  ArrowLeft, Sparkles, Rocket, Target, HeartHandshake,
  Activity, TrendingUp, Calendar, MessageCircle,
  Award, Download, Play, Pause, RotateCcw, Bell
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function LandingPage() {
  const { t, language } = useLanguage();
  const [isVisible, setIsVisible] = useState({});
  const [activeChat, setActiveChat] = useState<'old' | 'new' | 'both' | null>(null);
  const [chatMessages, setChatMessages] = useState({
    old: [],
    new: []
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const sectionRefs = useRef({});

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

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 hover:scale-105 transition-transform duration-300">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <span className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate max-w-[150px] sm:max-w-none">
              {t("app_title")}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              {t("landing_nav_how")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              {t("landing_nav_demo")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#results" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              {t("landing_nav_results")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#why" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              {t("landing_nav_why")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            <Link
              to="/login"
              className="hidden sm:block text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              {t("landing_nav_login")}
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
            >
              {t("landing_nav_start_now")}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 sm:py-20 md:py-24" ref={el => sectionRefs.current['hero'] = el}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />

        <div className={`relative mx-auto max-w-6xl px-4 text-center ${fadeInUpClass('hero')}`}>
          <Badge variant="outline" className="mb-4 px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20">
            <Sparkles className="h-4 w-4 ml-2" />
            {t("landing_hero_badge")}
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              {t("landing_hero_title_line1")}
            </span>
            <br />
            <span className="relative">
              {t("landing_hero_title_line2")}
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></span>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground">
            {t("landing_hero_subtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group relative w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-primary/80 px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {t("landing_hero_cta_primary")}
                <ArrowLeft className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>

            <a
              href="#demo"
              className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-foreground shadow-sm transition-all duration-300 hover:scale-105 hover:bg-card hover:shadow-md"
            >
              <Play className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <span>{t("landing_hero_cta_secondary")}</span>
            </a>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {t("landing_social_proof_clinics")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {t("landing_social_proof_rating")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">78%</div>
                <p className="text-sm text-muted-foreground mt-2">{t("landing_stat_return_rate")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">₪45K</div>
                <p className="text-sm text-muted-foreground mt-2">{t("landing_stat_monthly_revenue")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">24/7</div>
                <p className="text-sm text-muted-foreground mt-2">{t("landing_stat_auto_followup")}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">3.2x</div>
                <p className="text-sm text-muted-foreground mt-2">{t("landing_stat_roi")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how" className="py-16" ref={el => sectionRefs.current['how'] = el}>
        <div className={`mx-auto max-w-6xl px-4 ${fadeInUpClass('how')}`}>
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
      <section id="demo" className="py-16 bg-muted/30" ref={el => sectionRefs.current['demo'] = el}>
        <div className={`mx-auto max-w-6xl px-4 ${fadeInUpClass('demo')}`}>
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

          <div className="grid lg:grid-cols-2 gap-8">
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

              <Card>
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

            {/* Chat Mockups */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Old Client Chat */}
              <Card className="border-2 overflow-hidden">
                <div className="bg-[#075E54] text-white p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t("landing_chat_old_header_title")}</p>
                    <p className="text-xs opacity-80">{t("landing_chat_old_header_subtitle")}</p>
                  </div>
                </div>
                <div className="bg-[#ECE5DD] p-3 h-[760px] overflow-y-auto">
                  <div className="space-y-2">
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
                            "max-w-[80%] rounded-lg p-2 text-sm",
                            msg.type === 'sent'
                              ? 'bg-[#DCF8C6] rounded-br-none'
                              : msg.type === 'system'
                                ? 'bg-yellow-100 text-yellow-800 text-xs text-center w-full'
                                : 'bg-white rounded-bl-none'
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
                </div>
              </Card>

              {/* New Client Chat */}
              <Card className="border-2 overflow-hidden">
                <div className="bg-[#075E54] text-white p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Rocket className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{t("landing_chat_new_header_title")}</p>
                    <p className="text-xs opacity-80">{t("landing_chat_new_header_subtitle")}</p>
                  </div>
                </div>
                <div className="bg-[#ECE5DD] p-3 h-[760px] overflow-y-auto">
                  <div className="space-y-2">
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
                            "max-w-[80%] rounded-lg p-2 text-sm",
                            msg.type === 'sent'
                              ? 'bg-[#DCF8C6] rounded-br-none'
                              : msg.type === 'system'
                                ? 'bg-blue-100 text-blue-800 text-xs text-center w-full'
                                : 'bg-white rounded-bl-none'
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
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section id="results" className="py-16" ref={el => sectionRefs.current['results'] = el}>
        <div className={`mx-auto max-w-6xl px-4 ${fadeInUpClass('results')}`}>
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
                <div className="text-4xl font-bold text-success mb-2">78%</div>
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
                <div className="text-4xl font-bold text-primary mb-2">₪45K</div>
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
                <div className="text-4xl font-bold text-warning mb-2">8h</div>
                <p className="font-semibold">{t("landing_results_card3_title")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("landing_results_card3_subtitle")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
// Testimonials section - fixed version
      <section className="py-16 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t("landing_testimonials_title")}</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: t("landing_testimonial1_name"),
                clinic: t("landing_testimonial1_clinic"),
                text: t("landing_testimonial1_text"),
                rating: 5
              },
              {
                name: t("landing_testimonial2_name"),
                clinic: t("landing_testimonial2_clinic"),
                text: t("landing_testimonial2_text"),
                rating: 5
              }
            ].map((testimonial, i) => (
              <Card key={i} className="border-2">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.clinic}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <Card className="bg-gradient-to-br from-primary to-secondary border-0 text-white">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">{t("landing_cta_title")}</h2>
              <p className="text-white/80 mb-8 text-lg">
                {t("landing_cta_subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="rounded-full text-lg px-8">
                  <Download className="h-5 w-5 ml-2" />
                  {t("landing_cta_download_brochure")}
                </Button>
                <Link to="/signup">
                  <Button size="lg" className="rounded-full text-lg px-8 bg-white text-primary hover:bg-white/90">
                    {t("landing_cta_start_trial")}
                    <ArrowLeft className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-white/60 text-sm mt-6">
                {t("landing_cta_no_commitment")}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Phone className="h-5 w-5 text-primary" />
                <span className="font-bold">{t("app_title")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("landing_footer_description")}
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3">{t("landing_footer_product_title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">{t("landing_footer_product_features")}</a></li>
                <li><a href="#pricing" className="hover:text-foreground">{t("landing_footer_product_pricing")}</a></li>
                <li><a href="#demo" className="hover:text-foreground">{t("landing_footer_product_demo")}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">{t("landing_footer_company_title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-foreground">{t("landing_footer_company_about")}</a></li>
                <li><a href="#blog" className="hover:text-foreground">{t("landing_footer_company_blog")}</a></li>
                <li><a href="#contact" className="hover:text-foreground">{t("landing_footer_company_contact")}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">{t("landing_footer_contact_title")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>{t("landing_footer_contact_phone")}</li>
                <li>{t("landing_footer_contact_email")}</li>
                <li>{t("landing_footer_contact_address")}</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>{t("landing_footer_copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
