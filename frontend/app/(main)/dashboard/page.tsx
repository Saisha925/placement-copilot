import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { PageTransition } from '@/components/shared/PageTransition'
import { MessageSquare, Target, Code2, Sparkles, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await supabase.from('agent_state').select('*').eq('user_id', user.id).single()
  const state = data?.state || {}

  const readinessScore = state.readiness_score || 0
  const dsaScore = state.dsa_progress?.overall_score || 0
  
  const interviewHistory = state.interview_scores?.history || []
  const lastInterviewScore = interviewHistory.length > 0 ? interviewHistory[interviewHistory.length - 1].overall_score : 0

  const missingSkills = state.skill_gap?.missing_required?.slice(0, 5) || []

  return (
    <PageTransition className="flex flex-col gap-8 w-full max-w-6xl mx-auto mt-6 pb-16 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Your Dashboard</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Overview of your placement readiness, recent progress, and priority focus areas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 auto-rows-min">
        
        {/* Readiness Score Hero (spans 2x2 on lg) */}
        <div className="lg:col-span-2 lg:row-span-2 glass-card p-12 flex flex-col justify-center items-center text-center relative border border-white/5 bg-[#0a0a0a]/80 shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          
          <h2 className="text-[13px] font-bold text-zinc-400 uppercase tracking-[0.25em] mb-12 z-10">Placement Readiness</h2>
          
          <div className="relative w-72 h-72 flex items-center justify-center z-10">
            {/* Soft glowing backdrop for the circle */}
            <div className="absolute inset-0 rounded-full shadow-[0_0_80px_-15px_rgba(99,102,241,0.25)] opacity-50"></div>
            
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <defs>
                <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="144" cy="144" r="130" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="transparent" />
              <circle cx="144" cy="144" r="130" stroke="url(#score-gradient)" strokeWidth="6" fill="transparent"
                strokeDasharray="816.8" strokeDashoffset={816.8 - (816.8 * readinessScore) / 100}
                strokeLinecap="round"
                filter="url(#glow)"
                className="transition-all duration-1000 ease-out" />
            </svg>
            <div className="text-8xl font-bold text-white tracking-tighter z-30 flex items-baseline relative">
              {readinessScore}<span className="text-4xl text-zinc-500 font-normal ml-1">%</span>
            </div>
          </div>
          
          <p className="mt-12 text-[14px] text-zinc-400 max-w-md z-10 leading-relaxed font-medium">
            {readinessScore >= 80 ? "You're highly prepared. Keep refining your skills." : 
             readinessScore >= 50 ? "Solid progress. Focus on your identified weak spots." : 
             "Just starting out. Follow the Copilot's career plan to begin."}
          </p>
          
          <Link href="/copilot" className="mt-10 flex items-center justify-center w-full max-w-[300px] z-10 px-8 py-4 rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]">
            <Sparkles className="w-5 h-5 mr-2" />
            Launch AI Copilot
          </Link>
        </div>

        {/* DSA Progress */}
        <div className="glass-card p-8 flex flex-col justify-between group relative overflow-hidden border border-white/5 bg-[#0a0a0a]/80 min-h-[220px]">
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#10b981]/5 blur-[60px] rounded-full pointer-events-none transition-all group-hover:bg-[#10b981]/15 duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-[#10b981]/10 rounded-xl border border-[#10b981]/20 text-[#10b981] shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">DSA Progress</h3>
            </div>
            <div className="text-5xl font-bold mb-8 text-white tracking-tight flex items-baseline">{dsaScore}<span className="text-2xl font-bold text-zinc-500 ml-1">%</span></div>
            
            {/* Custom Sleek Progress Bar */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#10b981] rounded-full shadow-[0_0_15px_#10b981]" style={{ width: `${dsaScore}%` }}></div>
            </div>
          </div>
          <Link href="/dsa" className="mt-8 text-[12px] font-bold text-[#10b981] hover:text-[#34d399] transition-colors uppercase tracking-[0.15em] flex items-center gap-1 z-10 w-fit">Practice Now &rarr;</Link>
        </div>

        {/* Mock Interview */}
        <div className="glass-card p-8 flex flex-col justify-between group relative overflow-hidden border border-white/5 bg-[#0a0a0a]/80 min-h-[220px]">
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#8b5cf6]/5 blur-[60px] rounded-full pointer-events-none transition-all group-hover:bg-[#8b5cf6]/15 duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-[#8b5cf6]/10 rounded-xl border border-[#8b5cf6]/20 text-[#8b5cf6] shadow-[0_0_15px_rgba(139,92,246,0.15)]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">Interviews</h3>
            </div>
            <div className="text-5xl font-bold mb-8 text-white tracking-tight flex items-baseline">{lastInterviewScore}<span className="text-2xl font-bold text-zinc-500 ml-1">/10</span></div>
            
            {/* Custom Sleek Progress Bar */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-[#8b5cf6] rounded-full shadow-[0_0_15px_#8b5cf6]" style={{ width: `${lastInterviewScore * 10}%` }}></div>
            </div>
          </div>
          <Link href="/interview" className="mt-8 text-[12px] font-bold text-[#8b5cf6] hover:text-[#a78bfa] transition-colors uppercase tracking-[0.15em] flex items-center gap-1 z-10 w-fit">Schedule Mock &rarr;</Link>
        </div>

        {/* Missing Skills */}
        <div className="lg:col-span-3 glass-card p-8 group relative overflow-hidden border border-white/5 bg-[#0a0a0a]/80">
          <div className="absolute left-1/4 top-0 w-64 h-32 bg-[#f59e0b]/5 blur-[80px] rounded-full pointer-events-none transition-all group-hover:bg-[#f59e0b]/15 duration-500"></div>
          
          <div className="flex items-center justify-between mb-8 z-10 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#f59e0b]/10 rounded-xl border border-[#f59e0b]/20 text-[#f59e0b] shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">Priority Skill Gaps</h3>
            </div>
            <Link href="/career-plan" className="text-[11px] font-bold px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors uppercase tracking-[0.15em] flex items-center gap-1">
              View Analysis
            </Link>
          </div>
          
          <div className="flex flex-wrap gap-4 z-10 relative">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill: string) => (
                <div key={skill} className="px-5 py-2.5 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] text-[12px] font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                  {skill}
                </div>
              ))
            ) : (
              <div className="p-6 rounded-xl border border-white/10 bg-black/50 text-center w-full">
                <p className="text-[13px] text-zinc-400 font-medium">Run the Copilot to analyze your resume and find skill gaps.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
