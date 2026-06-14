'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Bot, Code2, Sparkles, Target, Zap, Shield, Cpu, Layers } from 'lucide-react'

const features = [
  {
    title: 'Multi-Agent Orchestration',
    description: 'A hive of 7 specialized AI agents working together to evaluate, plan, and guide your entire placement journey.',
    icon: <Cpu className="w-6 h-6 text-blue-400" />,
    className: 'md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20'
  },
  {
    title: 'Resume Intelligence',
    description: 'Deep ATS parsing and strategic improvements tailored to your target role.',
    icon: <Shield className="w-6 h-6 text-emerald-400" />,
    className: 'bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20'
  },
  {
    title: 'Adaptive Roadmaps',
    description: 'Dynamic 30/60/90 day study plans that adjust to your progress and deadlines.',
    icon: <Target className="w-6 h-6 text-purple-400" />,
    className: 'bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20'
  },
  {
    title: 'Mock Interviews',
    description: 'Realistic behavioral and technical grilling sessions.',
    icon: <Bot className="w-6 h-6 text-amber-400" />,
    className: 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20'
  },
  {
    title: 'DSA & System Design',
    description: 'Master core concepts with visual explanations and interactive algorithms.',
    icon: <Code2 className="w-6 h-6 text-rose-400" />,
    className: 'md:col-span-2 bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20'
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] selection:bg-primary/30 text-zinc-200 overflow-hidden font-sans">
      
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] translate-x-[-50%] w-[80%] h-[30%] rounded-full bg-emerald-600/5 blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
      </div>

      <div className="relative z-10">
        
        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 shadow-glow">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Placement Copilot</span>
          </div>
          <Link href="/login">
            <button className="px-5 py-2.5 text-sm font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all duration-300 backdrop-blur-md">
              Sign In
            </button>
          </Link>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium uppercase tracking-widest mb-8"
          >
            <Zap className="w-3.5 h-3.5" />
            Next-Gen Placement Intelligence
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-6xl md:text-8xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 mb-8 max-w-4xl"
          >
            Your AI Architect for <br className="hidden md:block" /> Dream Offers.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg md:text-xl text-zinc-400 max-w-2xl mb-12 leading-relaxed"
          >
            Stop guessing what recruiters want. Our multi-agent hive mind analyzes your resume, builds adaptive roadmaps, and grills you in mock interviews until you are undeniable.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link href="/dashboard">
              <button className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transition-all duration-300 transform hover:scale-105 flex items-center gap-2">
                Launch Copilot
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <a href="#features" className="px-8 py-4 text-zinc-300 font-medium hover:text-white transition-colors">
              Explore Features
            </a>
          </motion.div>

        </section>

        {/* Bento Grid Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-24 border-t border-white/5">
          
          <div className="mb-16 text-center sm:text-left">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Intelligence at every step.
            </h2>
            <p className="text-zinc-400 max-w-xl">
              We've fractured the preparation journey into specialized domains, each governed by an autonomous agent dedicated to your success.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`group relative overflow-hidden rounded-3xl border border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl p-8 hover:bg-[#111] transition-colors duration-500 ${feature.className || ''}`}
              >
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <div className="mb-6 p-3 rounded-xl bg-black/40 w-fit border border-white/5 shadow-inner">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  
                  {feature.className?.includes('md:col-span-2') && (
                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between text-xs font-medium uppercase tracking-widest text-zinc-500">
                      <span>Powered by DeepMind</span>
                      <Layers className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </motion.div>
            ))}
          </div>

        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 mt-12 text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Placement Copilot. Built for the modern engineer.</p>
        </footer>

      </div>
    </div>
  )
}
