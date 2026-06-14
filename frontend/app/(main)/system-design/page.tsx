'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { generateSystemDesignChallenge, evaluateSystemDesign } from '@/lib/api'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Server, LayoutTemplate, Play, Loader2, CheckCircle, Database, Sparkles } from 'lucide-react'

interface Challenge {
  title: string
  description: string
  requirements: string[]
}

interface Evaluation {
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
}

export default function SystemDesignPage() {
  const [targetRole, setTargetRole] = useState('Backend Engineer')
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loadingChallenge, setLoadingChallenge] = useState(false)
  
  const [solution, setSolution] = useState('')
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [evaluating, setEvaluating] = useState(false)

  async function handleGenerateChallenge() {
    if (!targetRole) return
    setLoadingChallenge(true)
    setEvaluation(null)
    setSolution('')
    try {
      const data = await generateSystemDesignChallenge(targetRole)
      setChallenge(data)
    } catch (e) {
      console.error(e)
      alert("Failed to generate challenge. Please try again.")
    } finally {
      setLoadingChallenge(false)
    }
  }

  async function handleSubmitSolution() {
    if (!solution.trim() || !challenge) return
    setEvaluating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous'
      const data = await evaluateSystemDesign(challenge, solution, userId)
      setEvaluation(data)
    } catch (e) {
      console.error(e)
      alert("Evaluation failed.")
    } finally {
      setEvaluating(false)
    }
  }

  return (
    <PageTransition className="w-full max-w-6xl mx-auto mt-6 flex flex-col gap-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">System Design</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Get role-specific architecture scenarios. Design scalable systems and receive instant AI feedback on your tradeoffs, APIs, and schema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDE: Challenge setup and details */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[80px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-sky-500/10"></div>
            
            <div className="space-y-6 relative z-10">
              <h3 className="text-[13px] font-semibold text-zinc-300 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-sky-400" /> Generate Challenge
              </h3>
              
              <div className="space-y-3">
                <Label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Target Role</Label>
                <Input 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  placeholder="e.g. Backend Engineer, Staff SWE"
                  className="bg-black/50 border-white/10 text-white focus:border-sky-500/50"
                />
              </div>

              <button 
                onClick={handleGenerateChallenge}
                disabled={loadingChallenge || !targetRole}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-500 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(14,165,233,0.2)] hover:shadow-[0_0_30px_rgba(14,165,233,0.4)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300"
              >
                {loadingChallenge ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                {loadingChallenge ? "Generating..." : "Generate Challenge"}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {challenge && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border border-sky-500/20 bg-sky-500/5 relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Server className="h-4 w-4 text-sky-400" />
                  <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Scenario
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{challenge.title}</h3>
                <p className="text-[13px] text-zinc-400 leading-relaxed mb-6">
                  {challenge.description}
                </p>
                <div>
                  <Label className="text-[11px] font-bold text-sky-400 uppercase tracking-widest">Requirements</Label>
                  <ul className="list-disc pl-4 mt-3 text-[13px] text-zinc-300 space-y-2 marker:text-sky-500">
                    {challenge.requirements.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT SIDE: Workspace and Evaluation */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {challenge ? (
              <motion.div 
                key="workspace"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col gap-6"
              >
                <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 flex flex-col">
                  <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                    <Database className="h-5 w-5 text-sky-400" />
                    <div>
                      <h3 className="text-[15px] font-semibold text-white">Architecture Workspace</h3>
                      <p className="text-[12px] text-zinc-500 mt-0.5">Write out your API endpoints, database schema, and high-level design.</p>
                    </div>
                  </div>
                  
                  <Textarea 
                    placeholder="1. Requirements & Capacity Estimation...&#10;2. High-Level Architecture...&#10;3. API Design...&#10;4. Database Schema...&#10;5. Bottlenecks & Trade-offs..."
                    className="flex-1 min-h-[400px] text-[13px] font-mono resize-none p-5 bg-black/60 border-white/10 text-zinc-300 focus:border-sky-500/50 leading-relaxed"
                    value={solution}
                    onChange={e => setSolution(e.target.value)}
                    disabled={evaluating}
                  />
                  
                  <div className="mt-6 flex justify-end">
                    <button 
                      onClick={handleSubmitSolution} 
                      disabled={!solution.trim() || evaluating} 
                      className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 border border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {evaluating ? <><Loader2 className="h-4 w-4 animate-spin text-sky-400" /> Evaluating Design...</> : "Submit Design for Review"}
                    </button>
                  </div>
                </div>

                {evaluation && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8 border border-emerald-500/20 bg-[#0a0a0a]/90 relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-emerald-500" />
                        <h3 className="text-xl font-bold text-white">Design Feedback</h3>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full font-bold text-sm border ${
                        evaluation.score >= 8 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : 
                        evaluation.score >= 5 ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : 
                        "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}>
                        Score: {evaluation.score}/10
                      </div>
                    </div>

                    <div className="space-y-8 relative z-10">
                      <div>
                        <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3 block">Detailed Feedback</span>
                        <p className="text-[14px] leading-relaxed text-zinc-300 bg-white/5 p-4 rounded-xl border border-white/5">{evaluation.feedback}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {evaluation.strengths && evaluation.strengths.length > 0 && (
                          <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-4 block">Strengths</span>
                            <ul className="list-disc pl-4 text-[13px] text-emerald-100/80 space-y-2 marker:text-emerald-500">
                              {evaluation.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                        {evaluation.improvements && evaluation.improvements.length > 0 && (
                          <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
                            <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest mb-4 block">Areas to Improve</span>
                            <ul className="list-disc pl-4 text-[13px] text-amber-100/80 space-y-2 marker:text-amber-500">
                              {evaluation.improvements.map((s, idx) => <li key={idx}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card h-full min-h-[500px] border border-white/5 bg-[#0a0a0a]/50 flex flex-col items-center justify-center text-center opacity-50"
              >
                <LayoutTemplate className="h-16 w-16 text-zinc-700 mb-6" />
                <p className="text-lg font-medium text-zinc-300">Workspace Ready</p>
                <p className="text-sm text-zinc-500 mt-2">Generate a challenge on the left to start designing.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  )
}
