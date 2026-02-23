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

export default function LandingPage() {
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
      title: "לקוח שלא הגיע חודש",
      steps: [
        { time: 0, message: "מערכת מזהה: 30 יום ללא תגובה", icon: Clock },
        { time: 2, message: "שליחת הודעה אוטומטית: 'היי דנה, מזמן לא ראינו אותך! יש לנו מבצע מיוחד החודש 🦷'", icon: MessageSquare },
        { time: 5, message: "לקוח מגיב: 'היי! אשמח לקבוע תור לבדיקה'", icon: Phone },
        { time: 7, message: "סטטוס מתעדכן אוטומטית ל'חם' 🔥", icon: TrendingUp },
        { time: 10, message: "התראה נשלחת למנהל המרפאה", icon: Bell },
        { time: 15, message: "תור נקבע! הכנסה חדשה: ₪450", icon: DollarSign },
      ]
    },
    {
      title: "ליד חדש שמתעניין",
      steps: [
        { time: 0, message: "הודעה חדשה מתקבלת: 'אשמח לפרטים על הלבנת שיניים'", icon: MessageSquare },
        { time: 1, message: "מערכת מזהה מילות מפתח: 'הלבנה', 'פרטים'", icon: Zap },
        { time: 3, message: "שליחת תשובה אוטומטית עם מחירון וזמינות", icon: Rocket },
        { time: 6, message: "לקוח מגיב: 'מתי אפשר להגיע?'", icon: Clock },
        { time: 8, message: "ליד הופך אוטומטית ל'חם', מנהל מקבל התראה", icon: Bell },
        { time: 12, message: "טיפול נקבע! המרה תוך 12 דקות", icon: CheckCircle },
      ]
    }
  ];

  // אנימציית צ'אט - לקוח ישן
  const oldClientMessages = [
    { id: 1, type: 'received', text: 'היי! עברו 3 חודשים מהביקור האחרון שלך 😊', delay: 500, status: 'sent' },
    { id: 2, type: 'received', text: 'רצינו לזכור לך שהגיע הזמן לבדיקה תקופתית. יש לנו מבצע מיוחד החודש! 🦷', delay: 1500, status: 'sent' },
    { id: 3, type: 'sent', text: 'אה כן! שכחתי לגמרי. מתי אפשר לקבוע?', delay: 3000, status: 'delivered' },
    { id: 4, type: 'received', text: 'מעולה! אפשר ביום שלישי בשעה 10:00 בוקר. מתאים? ✨', delay: 4500, status: 'sent' },
    { id: 5, type: 'sent', text: 'מושלם! רשמו אותי 👍', delay: 6000, status: 'read' },
    { id: 6, type: 'received', text: 'נהדר! נתראה בשבוע הבא! 🌟', delay: 7500, status: 'sent' },
    { id: 7, type: 'system', text: '✨ ליד הפך לחם! התראה נשלחה למנהל', delay: 8000, status: 'alert' },
  ];

  // אנימציית צ'אט - לקוח חדש
  const newClientMessages = [
    { id: 1, type: 'sent', text: 'שלום, אשמח לשמוע על הטיפולים שלכם', delay: 500, status: 'read' },
    { id: 2, type: 'received', text: 'היי! שמחים שפנית אלינו 😊 איזה טיפול מעניין אותך?', delay: 2000, status: 'sent' },
    { id: 3, type: 'sent', text: 'הלבנת שיניים, כמה זה עולה?', delay: 3500, status: 'delivered' },
    { id: 4, type: 'received', text: 'חבילת הלבנה פרימיום ₪1,200 כולל 3 טיפולים. רוצה לקבוע ייעוץ חינם? 🌟', delay: 5000, status: 'sent' },
    { id: 5, type: 'sent', text: 'כן! מתי אפשר?', delay: 6500, status: 'read' },
    { id: 6, type: 'received', text: 'מחר ב-16:00 או רביעי ב-10:00? מה נוח לך? 📅', delay: 8000, status: 'sent' },
    { id: 7, type: 'system', text: '🎯 ליד חדש! סטטוס: חם. נדרש איש קשר', delay: 8500, status: 'alert' },
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
    <div className="min-h-screen bg-background font-sans" dir="rtl">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:py-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 hover:scale-105 transition-transform duration-300">
              <Phone className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <span className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate max-w-[150px] sm:max-w-none">
              מערכת ניהול לידים
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              איך זה עובד
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              הדגמה
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#results" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              תוצאות
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
            <a href="#why" className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group">
              למה אנחנו
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="hidden sm:block text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
            >
              כניסה למערכת
            </Link>
            <Link
              to="/signup"
              className="rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/30"
            >
              התחל עכשיו
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
            מערכת אוטומטית להחזרת לקוחות
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-secondary bg-clip-text text-transparent">
              כמה טיפולים איבדת
            </span>
            <br />
            <span className="relative">
              החודש?
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></span>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-muted-foreground">
            המערכת שמזהה אוטומטית לקוחות שלא חזרו, שולחת להם תזכורות מותאמות אישית,
            ומחזירה אותם למרפאה - בלי שתצטרך לעשות כלום.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group relative w-full sm:w-auto rounded-full bg-gradient-to-r from-primary to-primary/80 px-8 py-4 text-lg font-bold text-primary-foreground shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl overflow-hidden"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                לתיאום הדגמה חינם
                <ArrowLeft className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
            </Link>

            <a
              href="#demo"
              className="group flex w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-8 py-4 text-lg font-semibold text-foreground shadow-sm transition-all duration-300 hover:scale-105 hover:bg-card hover:shadow-md"
            >
              <Play className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <span>צפה בהדגמה</span>
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
                +1,200 מרפאות משתמשות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                4.9/5 דירוג משתמשים
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
                <p className="text-sm text-muted-foreground mt-2">ממוצע החזרת לקוחות</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">₪45K</div>
                <p className="text-sm text-muted-foreground mt-2">הכנסה חודשית ממוצעת</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">24/7</div>
                <p className="text-sm text-muted-foreground mt-2">מעקב אוטומטי</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-transparent shadow-none text-center">
              <CardContent className="pt-6">
                <div className="text-4xl font-bold text-primary">3.2x</div>
                <p className="text-sm text-muted-foreground mt-2">ROI ממוצע</p>
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
              תהליך פשוט
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">איך המערכת עובדת?</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              3 שלבים פשוטים להחזרת לקוחות אבודים והגדלת הכנסות
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageSquare,
                title: "1. איסוף וניתוח",
                desc: "המערכת מחוברת לוואטסאפ העסקי, אוספת את כל ההודעות ומסננת אוטומטית שיחות עסקיות מאישיות",
                stats: "מזהה 95% מהשיחות הרלוונטיות"
              },
              {
                icon: Zap,
                title: "2. זיהוי וסיווג",
                desc: "מזהה לקוחות שלא הגיבו 3+ ימים, מסמנת לידים חמים ומציעה סטטוס אוטומטי לפי תוכן ההודעה",
                stats: "חוסך 8 שעות עבודה בשבוע"
              },
              {
                icon: Rocket,
                title: "3. מעקב אוטומטי",
                desc: "שולחת הודעות מותאמות אישית בימים 3,7,14, מזהה תגובות ומעדכנת סטטוס בזמן אמת",
                stats: "מחזיר 78% מהלקוחות האבודים"
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
              הדגמה חיה
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">ראו את המערכת בפעולה</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              לחצו על כפתור ההפעלה וצפו בזמן אמת איך המערכת מזהה לקוח שלא חזר,
              שולחת הודעה אוטומטית ומחזירה אותו למרפאה
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Demo Controls */}
            <div className="space-y-6">
              <Card className="border-2 border-primary/20">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    תהליך ההחזרה צעד אחר צעד
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
                      הפעל הדגמה
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
                  <h4 className="font-bold mb-3">תוצאות בזמן אמת</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">לקוחות שזוהו למעקב:</span>
                      <Badge>3</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">הודעות שנשלחו:</span>
                      <Badge variant="secondary">5</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">תגובות התקבלו:</span>
                      <Badge className="bg-success">2</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">הכנסה פוטנציאלית:</span>
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
                    <p className="font-bold text-sm">לקוח ותיק - לא הגיע 30 יום</p>
                    <p className="text-xs opacity-80">מזוהה למעקב אוטומטי</p>
                  </div>
                </div>
                <div className="bg-[#ECE5DD] p-3 h-[760px] overflow-y-auto">
                  <div className="space-y-2">
                    {chatMessages.old.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          msg.type === 'sent' ? 'justify-start' : 'justify-end'
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
                                {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
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
                    <p className="font-bold text-sm">ליד חדש - שואל על טיפולים</p>
                    <p className="text-xs opacity-80">מסווג אוטומטית כחם</p>
                  </div>
                </div>
                <div className="bg-[#ECE5DD] p-3 h-[760px] overflow-y-auto">
                  <div className="space-y-2">
                    {chatMessages.new.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex",
                          msg.type === 'sent' ? 'justify-start' : 'justify-end'
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
                                {new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
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
              תוצאות מוכחות
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">התוצאות מדברות בעד עצמן</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              מבוסס על נתונים אמיתיים מ-50 מרפאות בישראל
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
                  <Award className="h-8 w-8 text-success" />
                </div>
                <div className="text-4xl font-bold text-success mb-2">78%</div>
                <p className="font-semibold">החזרת לקוחות אבודים</p>
                <p className="text-sm text-muted-foreground mt-2">
                  מתוך 1,284 לקוחות שזוהו למעקב
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <div className="text-4xl font-bold text-primary mb-2">₪45K</div>
                <p className="font-semibold">הכנסה חודשית ממוצעת</p>
                <p className="text-sm text-muted-foreground mt-2">
                  עלייה של 230% תוך 3 חודשים
                </p>
              </CardContent>
            </Card>

            <Card className="text-center hover:scale-105 transition-all">
              <CardContent className="pt-8 pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-warning" />
                </div>
                <div className="text-4xl font-bold text-warning mb-2">8h</div>
                <p className="font-semibold">חיסכון בשבוע</p>
                <p className="text-sm text-muted-foreground mt-2">
                  זמן שעובדים חוסכים במעקב ידני
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
          <h2 className="text-3xl font-bold text-center mb-12">מה הלקוחות שלנו אומרים</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: "ד\"ר יעל כהן", // Fixed: escaped double quote
                clinic: "מרפאת שיניים הרצליה",
                text: "המערכת החזירה לנו 15 לקוחות בחודש הראשון! ההכנסה הנוספת כיסתה את עלות המערכת פי 3.",
                rating: 5
              },
              {
                name: "ד\"ר משה לוי", // Fixed: escaped double quote
                clinic: "מרכז לרפואת שיניים ת\"א", // Fixed: escaped double quote
                text: "חיסכון עצום בזמן. במקום לשלוח הודעות ידנית, המערכת עושה הכל אוטומטית ואנחנו רק קוטפים תוצאות.",
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
              <h2 className="text-3xl font-bold mb-4">מוכנים להחזיר לקוחות אבודים?</h2>
              <p className="text-white/80 mb-8 text-lg">
                הצטרפו ל-1,200+ מרפאות שכבר מגדילות הכנסות אוטומטית
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" className="rounded-full text-lg px-8">
                  <Download className="h-5 w-5 ml-2" />
                  הורדת חוברת מידע
                </Button>
                <Link to="/signup">
                  <Button size="lg" className="rounded-full text-lg px-8 bg-white text-primary hover:bg-white/90">
                    התחל ניסיון חינם
                    <ArrowLeft className="h-5 w-5 mr-2" />
                  </Button>
                </Link>
              </div>
              <p className="text-white/60 text-sm mt-6">
                אין התחייבות. ניסיון חינם ל-14 יום.
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
                <span className="font-bold">מערכת ניהול לידים</span>
              </div>
              <p className="text-sm text-muted-foreground">
                הפתרון החכם להחזרת לקוחות וניהול לידים למרפאות שיניים
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-3">מוצר</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground">תכונות</a></li>
                <li><a href="#pricing" className="hover:text-foreground">מחירון</a></li>
                <li><a href="#demo" className="hover:text-foreground">הדגמה</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">חברה</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#about" className="hover:text-foreground">אודות</a></li>
                <li><a href="#blog" className="hover:text-foreground">בלוג</a></li>
                <li><a href="#contact" className="hover:text-foreground">צור קשר</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-3">צור קשר</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>טלפון: 03-1234567</li>
                <li>אימייל: info@leads.co.il</li>
                <li>רחוב הרצל 12, תל אביב</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 מערכת ניהול לידים. כל הזכויות שמורות.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}