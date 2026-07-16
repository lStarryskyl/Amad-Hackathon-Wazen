import {
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from "framer-motion";
import {
  Activity,
  TrendingUp,
  Shield,
  BookOpen,
  Zap,
  Target,
  ArrowUpRight,
} from "lucide-react";
import icon from "@/assets/icon.png";
import logo from "@/assets/logo.png";
import { useRef, useEffect, useState, useCallback } from "react";

const GOLD = "#F59E0B";
const GOLD_DIM = "rgba(245,158,11,0.12)";
const GOLD_BORDER = "rgba(245,158,11,0.22)";
const BORDER = "rgba(255,255,255,0.07)";

const TICKER_ITEMS = [
  "Regret Score™",
  "AI Rescue Plans",
  "Money Stories",
  "Digital Twin Lab",
  "Behavioral Guardrails",
  "Financial Wazen",
  "Spending Patterns",
  "Wealth Simulation",
  "Smart Guardrails",
  "Growth Streaks",
];

function useAnimatedCounter(target: number, duration = 1.8) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  useEffect(() => {
    if (!inView) return;
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return { value, ref };
}

function WordReveal({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const { value: count, ref } = useAnimatedCounter(value);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ borderRight: `1px solid ${BORDER}` }}
      className="flex-1 px-10 py-12 last:border-r-0 text-center"
    >
      <div className="text-5xl md:text-6xl font-black text-white tracking-tight mb-2">
        {count.toLocaleString()}
        <span style={{ color: GOLD }}>{suffix}</span>
      </div>
      <div className="text-sm font-medium uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
        {label}
      </div>
    </motion.div>
  );
}

function CapabilityCard({ eyebrow, heading, sub, delay }: { eyebrow: string; heading: string; sub: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 px-10 py-12 last:border-r-0 text-center"
      style={{ borderRight: `1px solid ${BORDER}` }}
    >
      <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: GOLD }}>
        {eyebrow}
      </div>
      <div className="text-4xl md:text-5xl font-black text-white tracking-tight mb-3">
        {heading}
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
        {sub}
      </div>
    </motion.div>
  );
}

function FeatureBlock({
  icon: Icon,
  eyebrow,
  title,
  desc,
  flip,
  accent,
}: {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  desc: string;
  flip?: boolean;
  accent?: string;
}) {
  const col = accent ?? GOLD;
  return (
    <div className={`max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center ${flip ? "md:[&>*:first-child]:order-2" : ""}`}>
      <motion.div
        initial={{ opacity: 0, x: flip ? 40 : -40 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6"
      >
        <div
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
          style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}
        >
          <Icon className="w-3.5 h-3.5" />
          {eyebrow}
        </div>
        <h3 className="text-3xl md:text-4xl font-bold leading-tight text-white">{title}</h3>
        <p className="text-lg leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
          {desc}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-10 flex items-center justify-center min-h-[280px]"
        style={{
          background: `linear-gradient(135deg, ${col}08 0%, transparent 60%)`,
          border: `1px solid ${col}18`,
        }}
      >
        <Icon style={{ color: col, opacity: 0.18 }} className="w-40 h-40" strokeWidth={0.8} />
      </motion.div>
    </div>
  );
}

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, 80]);
  const heroScale = useTransform(scrollYProgress, [0, 0.6], [1, 0.97]);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const glowX = useSpring(mouseX, { stiffness: 80, damping: 20 });
  const glowY = useSpring(mouseY, { stiffness: 80, damping: 20 });

  const handleMouse = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    },
    [mouseX, mouseY]
  );

  const ticker = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div
      className="min-h-screen overflow-hidden selection:bg-amber-500/20"
      style={{ backgroundColor: "#09090B", color: "#FAFAFA" }}
    >
      {/* ── NAV ── */}
      <nav
        className="fixed top-0 w-full z-50"
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(9,9,11,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between" style={{ height: 72 }}>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg tracking-tight text-white">Wazen</span>
          </div>
          <motion.button
            data-testid="nav-download-btn"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="px-5 py-2 rounded-full text-sm font-semibold"
            style={{
              background: GOLD,
              color: "#09090B",
              boxShadow: `0 0 24px ${GOLD}50`,
            }}
          >
            Get Wazen
          </motion.button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        onMouseMove={handleMouse}
        className="relative pt-40 pb-36 px-6 overflow-hidden"
      >
        {/* Mouse-tracking ambient glow */}
        <motion.div
          style={{
            x: glowX,
            y: glowY,
            translateX: "-50%",
            translateY: "-50%",
          }}
          className="pointer-events-none absolute w-[700px] h-[700px] rounded-full"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              background: `radial-gradient(circle, ${GOLD}18 0%, transparent 65%)`,
            }}
          />
        </motion.div>

        {/* Subtle grid */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage: `linear-gradient(${BORDER} 1px, transparent 1px), linear-gradient(90deg, ${BORDER} 1px, transparent 1px)`,
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 100%)",
          }}
        />

        <motion.div
          style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
          className="max-w-5xl mx-auto text-center relative z-10"
        >
          {/* App icon with pulse rings */}
          <motion.div
            className="relative w-24 h-24 mx-auto mb-12"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="pulse-ring absolute inset-0 rounded-2xl"
              style={{ border: `2px solid ${GOLD}`, animationDelay: "0s" }}
            />
            <span
              className="pulse-ring absolute inset-0 rounded-2xl"
              style={{ border: `2px solid ${GOLD}`, animationDelay: "0.8s" }}
            />
            <img
              src={icon}
              alt="Wazen"
              className="w-24 h-24 rounded-2xl relative z-10"
              style={{ boxShadow: `0 0 0 1px ${BORDER}, 0 24px 64px ${GOLD}30` }}
            />
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{
              border: `1px solid ${GOLD_BORDER}`,
              background: GOLD_DIM,
              color: GOLD,
            }}
          >
            <Activity className="w-3.5 h-3.5" />
            AI-Powered Personal Finance
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] mb-8">
            <WordReveal text="Know your money." />
            <br />
            <span style={{ color: GOLD }}>
              <WordReveal text="Before it knows you." />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Wazen scores every spending decision in real-time, generates rescue plans when budgets slip,
            and narrates your financial life in plain English — powered by AI that actually knows your habits.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.button
              data-testid="hero-ios-btn"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2"
              style={{
                background: GOLD,
                color: "#09090B",
                boxShadow: `0 0 40px ${GOLD}40`,
              }}
            >
              Download on App Store
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              data-testid="hero-android-btn"
              whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.18)" }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base transition-colors"
              style={{
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              Get it on Google Play
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── TICKER ── */}
      <div
        className="py-4 overflow-hidden border-y"
        style={{ borderColor: BORDER, background: "#0D0D0F" }}
      >
        <div className="flex w-max marquee-track">
          {ticker.map((item, i) => (
            <span key={i} className="flex items-center gap-4 px-6 text-sm font-medium whitespace-nowrap" style={{ color: "rgba(255,255,255,0.35)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: i % 3 === 0 ? GOLD : "rgba(255,255,255,0.2)" }}
              />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── CAPABILITIES ── */}
      <section
        className="border-b"
        style={{ borderColor: BORDER, background: "#0D0D0F" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row divide-y md:divide-y-0" style={{ borderColor: BORDER }}>
          <CapabilityCard
            eyebrow="Regret Score"
            heading="0 – 100"
            sub="Every purchase scored in real-time against your personal spending patterns and stated goals"
            delay={0}
          />
          <CapabilityCard
            eyebrow="History Analyzed"
            heading="6 months"
            sub="Wazen ingests your full transaction history to build a financial model that's specific to you"
            delay={0.1}
          />
          <CapabilityCard
            eyebrow="AI Rescue Plan"
            heading="< 30 sec"
            sub="When budgets slip, a personalized step-by-step recovery plan generated from your actual data"
            delay={0.2}
          />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-32 space-y-32">
        <div className="text-center px-6 mb-4">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-[0.2em] mb-4"
            style={{ color: GOLD }}
          >
            What Wazen Does
          </motion.p>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white">
            <WordReveal text="A new operating system for your money." />
          </h2>
        </div>

        <FeatureBlock
          icon={Activity}
          eyebrow="Regret Score™"
          title="Catch bad decisions before your card clears."
          desc="Every purchase gets scored 0–100 based on your patterns, goals, and past regret data. Wazen flags the ones you'll regret — before they become a problem."
          accent={GOLD}
        />

        <FeatureBlock
          icon={Zap}
          eyebrow="Rescue Plans"
          title="A personalized recovery plan in seconds."
          desc="Overspent this month? Wazen analyzes your actual transactions and drafts a step-by-step plan to get back on track — not generic advice, your situation."
          flip
          accent="#60A5FA"
        />

        <FeatureBlock
          icon={BookOpen}
          eyebrow="Money Stories"
          title="Your financial life, narrated in plain English."
          desc="Every month, Wazen writes you a short story about your spending — what worked, what didn't, and what the data says about your habits. It reads like a chapter, not a ledger."
          accent="#34D399"
        />

        <FeatureBlock
          icon={TrendingUp}
          eyebrow="Digital Twin Lab"
          title="Run what-if scenarios against your real data."
          desc={`"What if I cut dining out by $150/mo?" See the ripple effects across savings, investments, and your regret score — simulated against your real financial DNA.`}
          flip
          accent={GOLD}
        />

        <FeatureBlock
          icon={Shield}
          eyebrow="Behavioral Guardrails"
          title="Limits that adapt to how you actually live."
          desc="Not another rigid budget. Wazen sets dynamic spending guardrails that learn your patterns, adjust to your lifestyle, and alert you before you cross the line."
          accent="#A78BFA"
        />

        <FeatureBlock
          icon={Target}
          eyebrow="Streaks & Growth"
          title="Make good habits impossible to break."
          desc="Track your streaks, celebrate milestones, and watch your financial health score climb. Wazen makes the boring parts of money management feel worth doing."
          flip
          accent="#F87171"
        />
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${GOLD}10 0%, transparent 70%)`,
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto text-center relative z-10 rounded-3xl p-14 md:p-20"
          style={{
            background: "linear-gradient(145deg, #111113 0%, #0D0D0F 100%)",
            border: `1px solid ${GOLD_BORDER}`,
            boxShadow: `0 0 80px ${GOLD}18`,
          }}
        >
          <div
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-8"
            style={{ background: GOLD_DIM, color: GOLD, border: `1px solid ${GOLD_BORDER}` }}
          >
            <Activity className="w-3.5 h-3.5" />
            Available Now
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-5 tracking-tight text-white leading-tight">
            Stop wondering where it all went.
          </h2>
          <p className="text-lg mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Download Wazen and finally have a financial advisor that knows your habits,
            not just your balance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.button
              data-testid="cta-ios-btn"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base flex items-center justify-center gap-2"
              style={{
                background: GOLD,
                color: "#09090B",
                boxShadow: `0 0 32px ${GOLD}40`,
              }}
            >
              Download on App Store
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
            <motion.button
              data-testid="cta-android-btn"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-8 py-4 rounded-full font-semibold text-base"
              style={{
                background: "transparent",
                border: `1px solid ${BORDER}`,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              Get it on Google Play
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-12 px-6 text-center"
        style={{ borderTop: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <img src={icon} alt="Wazen" className="w-5 h-5 rounded-lg opacity-40 grayscale" />
          <span className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: "rgba(255,255,255,0.3)" }}>
            Wazen Finance
          </span>
        </div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
          © {new Date().getFullYear()} Wazen Finance. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
