import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Activity, Zap, BookOpen, Fingerprint, Shield, Trophy } from "lucide-react";
import logo from "@/assets/logo.png";
import icon from "@/assets/icon.png";
import { useRef } from "react";

export default function Home() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 100]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Pulse" className="h-8 object-contain" />
          </div>
          <button 
            data-testid="nav-download-btn"
            className="px-6 py-2.5 bg-white text-background rounded-full font-medium hover:bg-primary hover:text-white transition-colors duration-300 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          >
            Get Pulse
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-40 pb-32 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-[40%] left-[60%] -translate-x-1/2 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] mix-blend-screen" />
        </div>

        <motion.div 
          style={{ opacity: heroOpacity, y: heroY }}
          className="max-w-4xl mx-auto text-center relative z-10"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <img src={icon} alt="Pulse Icon" className="w-24 h-24 mx-auto mb-8 drop-shadow-2xl rounded-2xl border border-white/10" />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold tracking-tight mb-8 leading-[1.1]"
          >
            Your financial pulse, <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">powered by AI.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
          >
            We track your spending patterns, catch regret-worthy decisions before they happen, and build personalized rescue plans when things go sideways.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button data-testid="hero-ios-btn" className="w-full sm:w-auto px-8 py-4 bg-white text-background rounded-full font-semibold text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
              Download on App Store
            </button>
            <button data-testid="hero-android-btn" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
              Get it on Google Play
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* REGRET METER (Value Prop) */}
      <section className="py-32 px-6 bg-card border-y border-white/5">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
              <Activity className="w-4 h-4" />
              AI Regret Meter
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">Catch bad habits before they compound.</h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Pulse scores your spending decisions 0-100 in real-time. It learns what actually makes you happy and what leaves you with buyer's remorse, gently nudging you away from the edge.
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-full bg-gradient-to-tr from-destructive/20 via-background to-secondary/20 border border-white/10 flex items-center justify-center relative overflow-hidden">
              <div className="text-center z-10">
                <div className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">87</div>
                <div className="text-muted-foreground mt-2 tracking-widest uppercase text-sm">REGRET SCORE</div>
              </div>
              <div className="absolute inset-0 border-[16px] border-secondary/20 rounded-full" />
              <div className="absolute inset-0 border-[16px] border-t-secondary border-r-secondary border-b-transparent border-l-transparent rounded-full rotate-45" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">A completely new financial operating system.</h2>
            <p className="text-xl text-muted-foreground">Not a spreadsheet. Not a bank. A brilliant money-savvy friend in your pocket.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Zap}
              title="Rescue Plans"
              desc="When things go sideways, Pulse generates a personalized action plan from your actual transactions to get you back on track."
              delay={0.1}
            />
            <FeatureCard 
              icon={BookOpen}
              title="Money Stories"
              desc="Every month, get an AI-narrated story of your financial journey. Read it like a chapter of your life, not a ledger."
              delay={0.2}
            />
            <FeatureCard 
              icon={Fingerprint}
              title="Digital Twin Lab"
              desc="Run what-if simulations against your real data. 'What if I saved $200 more per month?' See the ripple effects instantly."
              delay={0.3}
            />
            <FeatureCard 
              icon={Shield}
              title="Behavioral Guardrails"
              desc="Set smart spending limits that adapt to your real habits. Pulse knows when to hold you back and when to let you live."
              delay={0.4}
              className="md:col-span-2"
            />
            <FeatureCard 
              icon={Trophy}
              title="Streaks & Growth"
              desc="Gamify your financial health. Build streaks, unlock achievements, and make good habits stick."
              delay={0.5}
            />
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-[400px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10 bg-card/50 backdrop-blur-2xl border border-white/10 p-12 md:p-20 rounded-3xl">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">Stop wondering where it all went.</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of people who have found financial peace of mind. Download Pulse and meet your new money AI today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button data-testid="cta-ios-btn" className="w-full sm:w-auto px-8 py-4 bg-white text-background rounded-full font-semibold text-lg hover:scale-105 transition-transform">
              Download on App Store
            </button>
            <button data-testid="cta-android-btn" className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-semibold text-lg hover:bg-white/10 transition-colors">
              Get it on Google Play
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <img src={icon} alt="Pulse Icon" className="w-6 h-6 grayscale opacity-50" />
          <span className="font-semibold text-white/50 tracking-wider">PULSE</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} Pulse Finance. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, delay, className = "" }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.6 }}
      className={`p-8 rounded-3xl bg-card border border-white/5 hover:border-primary/30 transition-colors group ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-2xl font-bold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </motion.div>
  );
}
