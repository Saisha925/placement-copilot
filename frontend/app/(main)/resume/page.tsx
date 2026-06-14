'use client'
import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { analyzeResume } from '@/lib/api'
import { createClient } from '@/lib/supabase'
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2, Sparkles, Target, Award, Zap } from 'lucide-react'
import { PageTransition } from '@/components/shared/PageTransition'
import { motion, AnimatePresence } from 'framer-motion'

const roles = [
  'SDE',
  'Data Analyst',
  'ML Engineer',
  'AI Engineer',
  'Backend Engineer',
  'Product Manager'
]

export default function ResumePage() {
  const [file, setFile] = useState<File | null>(null)
  const [targetRole, setTargetRole] = useState('SDE')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0])
    setResult(null)
    setError('')
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1
  })

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'anonymous'
      const response = await analyzeResume(file, targetRole, userId)
      setResult(response.data)
    } catch (err) {
      setError('Analysis failed. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition className="w-full max-w-5xl mx-auto mt-6 flex flex-col gap-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <FileText className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Resume Analyzer</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Upload your resume and target role. Our AI agent will extract your skills, highlight weaknesses, and instantly generate optimized bullet points.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column - Input */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-32 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-emerald-500/10"></div>
            
            <div className="space-y-6 relative z-10">
              
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300
                  ${isDragActive 
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)]' 
                    : 'border-white/10 bg-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5'}`}
              >
                <input {...getInputProps()} />
                <Upload className={`h-8 w-8 mx-auto mb-4 transition-colors ${isDragActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-300">{file.name}</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-white">Drop your resume here</p>
                    <p className="text-xs text-zinc-500 mt-2 tracking-wide">ONLY PDF FORMAT ACCEPTED</p>
                  </div>
                )}
              </div>

              {/* Role Selector */}
              <div className="space-y-3">
                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                  <Target className="w-3 h-3" /> Target Role
                </label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <button
                      key={role}
                      onClick={() => setTargetRole(role)}
                      className={`text-[12px] px-4 py-2 rounded-lg border transition-all duration-300 ${
                        targetRole === role
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-[13px] text-red-400 font-medium">{error}</p>}

              <button
                onClick={handleAnalyze}
                disabled={!file || loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500 text-black font-bold rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 transform active:scale-95"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="h-5 w-5" /> Analyze Resume</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {!result && !loading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="glass-card p-12 border border-white/5 bg-[#0a0a0a]/80 h-full flex flex-col items-center justify-center text-center opacity-50"
              >
                <Zap className="h-16 w-16 text-zinc-600 mb-6" />
                <h3 className="text-xl font-semibold text-white tracking-tight mb-2">Awaiting Upload</h3>
                <p className="text-sm text-zinc-400 max-w-md">
                  Once you drop your resume and hit analyze, our AI will instantly break down your profile and provide actionable feedback.
                </p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="glass-card p-12 border border-emerald-500/20 bg-emerald-500/5 h-full flex flex-col items-center justify-center text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]"
              >
                <Loader2 className="h-16 w-16 text-emerald-500 animate-spin mb-6" />
                <h3 className="text-xl font-semibold text-emerald-400 tracking-tight mb-2">Analyzing Profile</h3>
                <p className="text-sm text-emerald-500/70 max-w-md animate-pulse">
                  Parsing layout, matching keywords, and generating improvements...
                </p>
              </motion.div>
            )}

            {result && !loading && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="flex flex-col gap-6"
              >
                {/* Score Card */}
                <div className="glass-card p-8 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-48 h-48 bg-primary/10 blur-[60px] rounded-full pointer-events-none"></div>
                  
                  <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-primary/10 rounded-md border border-primary/20 text-primary">
                      <Award className="w-5 h-5" />
                    </div>
                    <h3 className="font-semibold text-[13px] tracking-wider uppercase text-zinc-300">ATS Match Score</h3>
                  </div>
                  
                  <div className="flex items-end gap-2 mb-4 relative z-10">
                    <span className="text-6xl font-bold text-white tracking-tighter">{result.ats_score}</span>
                    <span className="text-2xl font-bold text-zinc-500 mb-1">/100</span>
                  </div>
                  
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-4 relative z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${result.ats_score}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full shadow-[0_0_15px_#3b82f6]" 
                    />
                  </div>
                  <p className="text-sm text-zinc-400 relative z-10">
                    {result.ats_score >= 80 ? 'Excellent — your resume is highly optimized for this role.' :
                     result.ats_score >= 60 ? 'Good — but a few targeted improvements will boost your chances.' :
                     'Needs work — follow the critical suggestions below to pass the ATS.'}
                  </p>
                </div>

                {/* Quick Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card p-5 border border-white/5 bg-[#0a0a0a]/80">
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Strengths</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.strengths.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card p-5 border border-white/5 bg-[#0a0a0a]/80">
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Missing Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.missing_skills.map((s: string, i: number) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">Critical Issues</h4>
                    <div className="space-y-3">
                      {result.issues.map((issue: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                          {issue.type === 'error'
                            ? <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                            : <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />}
                          <p className="text-[13px] text-zinc-300 leading-relaxed">{issue.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {result.suggestions.length > 0 && (
                  <div className="glass-card p-6 border border-white/5 bg-[#0a0a0a]/80">
                    <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">AI Bullet Point Revisions</h4>
                    <div className="space-y-4">
                      {result.suggestions.map((s: any, i: number) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                            <p className="text-[10px] text-red-400/80 uppercase tracking-widest font-semibold mb-2">Original</p>
                            <p className="text-[13px] text-zinc-300 leading-relaxed">{s.original}</p>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Improved
                            </p>
                            <p className="text-[13px] text-emerald-100/90 leading-relaxed font-medium">{s.improved}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </PageTransition>
  )
}