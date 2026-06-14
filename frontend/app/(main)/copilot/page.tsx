'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { runCopilot } from '@/lib/api'
import { Loader2, Sparkles, Target, Brain, FileText, CheckCircle2 } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'
import { AIVisualizer } from '@/components/ui/ai-visualizer'

const TARGET_ROLES = [
  'Backend Engineer',
  'Software Engineer',
  'Frontend Engineer',
  'Data Analyst',
  'ML Engineer',
  'AI Engineer',
]

const EXAMPLE_GOALS = [
  'Help me become interview-ready for Backend Engineer in 2 months',
  'I have campus placements in 6 weeks, help me prepare',
  'Analyse my resume and create a study plan for Software Engineer roles',
  'I want to target Amazon SDE — what should I focus on?',
]

export default function CopilotPage() {
  const router = useRouter()
  const supabase = createClient()

  const [goal, setGoal] = useState('')
  const [targetRole, setTargetRole] = useState('Backend Engineer')
  const [targetCompany, setTargetCompany] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [resumeText, setResumeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [agentLog, setAgentLog] = useState<string[]>([])
  const [error, setError] = useState('')

  async function handleRun() {
    if (!goal.trim()) {
      setError('Please enter your goal first.')
      return
    }

    setError('')
    setLoading(true)
    setAgentLog(['Supervisor Agent analyzing your goal...'])

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const logSteps = [
        'Resume Agent evaluating your profile...',
        'Skill Gap Agent identifying missing skills...',
        'DSA Agent assessing algorithms...',
        'Interview Agent preparing mock questions...',
        'Project Recommender selecting projects...',
        'Career Planner generating your 30/60/90 day plan...',
        'Finalizing recommendations...',
      ]
      let stepIndex = 0
      const logInterval = setInterval(() => {
        if (stepIndex < logSteps.length) {
          setAgentLog(prev => [...prev, logSteps[stepIndex]])
          stepIndex++
        }
      }, 2500)

      const result = await runCopilot(
        user.id,
        goal,
        targetRole,
        resumeText || undefined,
        targetCompany || undefined,
        targetDate || undefined,
      )

      clearInterval(logInterval)
      setAgentLog(prev => [...prev, '✅ All agents complete!'])

      sessionStorage.setItem('copilot_result', JSON.stringify(result))
      sessionStorage.setItem('copilot_role', targetRole)
      sessionStorage.setItem('copilot_goal', goal)

      setTimeout(() => router.push('/career-plan'), 1200)

    } catch (err) {
      setError('Something went wrong. Please try again.')
      setAgentLog([])
    } finally {
      setLoading(false)
    }
  }

  // Derive the current AI State from the agent logs
  let aiState: 'idle' | 'analyzing' | 'thinking' | 'connecting' | 'finalizing' | 'complete' = 'idle'
  if (agentLog.length > 0) {
    const lastLog = agentLog[agentLog.length - 1]
    if (lastLog?.includes('analyzing')) aiState = 'analyzing'
    else if (lastLog?.includes('evaluating') || lastLog?.includes('assessing') || lastLog?.includes('preparing')) aiState = 'thinking'
    else if (lastLog?.includes('identifying') || lastLog?.includes('selecting') || lastLog?.includes('generating')) aiState = 'connecting'
    else if (lastLog?.includes('Finalizing')) aiState = 'finalizing'
    else if (lastLog?.includes('complete')) aiState = 'complete'
    else aiState = 'thinking'
  }

  return (
    <PageTransition className="w-full max-w-6xl mx-auto mt-6 flex flex-col gap-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Placement Copilot</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Tell me your placement goal — I&apos;ll orchestrate a team of specialized AI agents to analyze your resume, find your weak spots, and build a personalized action plan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column — Inputs */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Goal Input Card */}
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-32 bg-primary/5 blur-[80px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-primary/10"></div>
            
            <div className="flex items-center gap-2 mb-4 relative z-10">
              <Target className="h-4 w-4 text-primary" /> 
              <h2 className="font-semibold text-[13px] tracking-wider uppercase text-zinc-300">Your Goal</h2>
            </div>
            
            <div className="space-y-4 relative z-10">
              <textarea
                className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-primary/50 focus:bg-primary/5 focus:shadow-glow transition-all duration-300"
                placeholder="e.g. Help me become interview-ready for Backend Engineer in 2 months"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                disabled={loading}
              />
              
              <div className="space-y-2">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Example Goals</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_GOALS.map(eg => (
                    <button
                      key={eg}
                      onClick={() => setGoal(eg)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-left text-zinc-300"
                      disabled={loading}
                    >
                      {eg.length > 50 ? eg.slice(0, 50) + '…' : eg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-32 h-32 bg-purple-500/5 blur-[60px] rounded-full pointer-events-none"></div>
            
            <div className="flex items-center gap-2 mb-6 relative z-10">
              <Brain className="h-4 w-4 text-purple-400" /> 
              <h2 className="font-semibold text-[13px] tracking-wider uppercase text-zinc-300">Target Details</h2>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Target Role</label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => setTargetRole(role)}
                      disabled={loading}
                      className={`text-[12px] px-4 py-2 rounded-lg border transition-all duration-300 ${
                        targetRole === role
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="company" className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Target Company (optional)</label>
                  <input
                    id="company"
                    placeholder="e.g. Amazon"
                    value={targetCompany}
                    onChange={e => setTargetCompany(e.target.value)}
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="date" className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">Placement Date (optional)</label>
                  <input
                    id="date"
                    type="date"
                    value={targetDate}
                    onChange={e => setTargetDate(e.target.value)}
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Resume optional text */}
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-400" /> 
                <h2 className="font-semibold text-[13px] tracking-wider uppercase text-zinc-300">Resume Context</h2>
              </div>
            </div>
            <textarea
              className="w-full min-h-[100px] rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all duration-300"
              placeholder="Paste updated resume text here if you want to override your saved resume for this run."
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              disabled={loading}
            />
          </div>

        </div>

        {/* Right column — Action & Logs */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="glass-card p-6 border border-primary/20 bg-primary/5 shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
            
            {error && <p className="text-[13px] text-red-400 mb-4 font-medium">{error}</p>}
            
            <button
              onClick={handleRun}
              disabled={loading || !goal.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white font-semibold rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 transform active:scale-95 z-10 relative"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Orchestrating Agents...</>
              ) : (
                <><Sparkles className="h-5 w-5" /> Launch Copilot</>
              )}
            </button>
            <p className="text-center text-[11px] text-zinc-400 mt-4 tracking-wide relative z-10">
              Powered by deep multi-agent workflow
            </p>
          </div>

          <div className="glass-card p-6 flex-1 border border-white/5 bg-[#0a0a0a]/80 min-h-[400px] flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[11px] tracking-[0.15em] uppercase text-zinc-500">Agent Activity Stream</h3>
              {loading && <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>}
            </div>

            {/* Premium AI State Animation block */}
            <AIVisualizer state={aiState} />
            
            <div className="flex-1 bg-black/50 rounded-xl border border-white/5 p-4 overflow-y-auto max-h-[300px]">
              {agentLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30 mt-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Awaiting Instructions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence>
                    {agentLog.map((log, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-3"
                      >
                        <div className="mt-1 flex-shrink-0">
                          {log?.startsWith('✅') ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          )}
                        </div>
                        <p className={`text-sm ${log?.startsWith('✅') ? 'text-emerald-400 font-medium' : 'text-zinc-300'}`}>
                          {log}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </PageTransition>
  )
}