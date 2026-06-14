'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { PageTransition } from '@/components/shared/PageTransition'
import { Save, User, Briefcase, GraduationCap, Code2, Loader2, CheckCircle2, Settings } from 'lucide-react'


export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    target_role: '',
    semester: '',
    cgpa: '',
    target_package_lpa: '',
    preferred_roles: '',
    daily_hours: '',
    graduation_year: '',
    preferred_companies: ''
  })

  // Use an environment variable or standard constant to avoid hardcoding localhost
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      
      try {
        const res = await fetch(`${baseUrl}/settings/${user.id}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        
        if (data.profile) {
          setFormData({
            target_role: data.target_role || '',
            semester: data.profile.semester?.toString() || '',
            cgpa: data.profile.cgpa?.toString() || '',
            target_package_lpa: data.profile.target_package_lpa?.toString() || '',
            preferred_roles: data.profile.preferred_roles?.join(', ') || '',
            daily_hours: data.profile.daily_hours?.toString() || '',
            graduation_year: data.profile.graduation_year?.toString() || '',
            preferred_companies: data.profile.preferred_companies?.join(', ') || ''
          })
        }
      } catch (err) {
        console.error("Failed to load profile", err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        target_role: formData.target_role,
        semester: formData.semester ? parseInt(formData.semester) : null,
        cgpa: formData.cgpa ? parseFloat(formData.cgpa) : null,
        target_package_lpa: formData.target_package_lpa ? parseFloat(formData.target_package_lpa) : null,
        preferred_roles: formData.preferred_roles ? formData.preferred_roles.split(',').map(s => s.trim()) : [],
        daily_hours: formData.daily_hours ? parseInt(formData.daily_hours) : null,
        graduation_year: formData.graduation_year ? parseInt(formData.graduation_year) : null,
        preferred_companies: formData.preferred_companies ? formData.preferred_companies.split(',').map(s => s.trim()) : [],
      }

      const res = await fetch(`${baseUrl}/settings/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      alert("Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <PageTransition className="w-full max-w-5xl mx-auto mt-6 flex flex-col gap-8 pb-16 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 shadow-[0_0_15px_rgba(161,161,170,0.1)]">
              <Settings className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Profile Settings</h1>
          </div>
          <p className="text-zinc-400 text-sm mt-3 max-w-xl">
            Personalize the Copilot's career advice, study plans, and algorithms to match your exact goals.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-[13px] shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all ${
            saved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white text-black hover:bg-zinc-200"
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved Successfully' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
        
        {/* Academic Details */}
        <div className="glass-card p-8 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-blue-500/20 transition-all duration-500"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">Academic Info</h3>
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Graduation Year</label>
              <input 
                name="graduation_year" 
                value={formData.graduation_year} 
                onChange={handleChange} 
                placeholder="e.g. 2026" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all shadow-inner" 
              />
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Semester</label>
                <input 
                  name="semester" 
                  value={formData.semester} 
                  onChange={handleChange} 
                  placeholder="e.g. 6" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all shadow-inner" 
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Current CGPA</label>
                <input 
                  name="cgpa" 
                  value={formData.cgpa} 
                  onChange={handleChange} 
                  placeholder="e.g. 8.5" 
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/5 transition-all shadow-inner" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Career Goals */}
        <div className="glass-card p-8 border border-white/5 bg-[#0a0a0a]/80 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-all duration-500"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
              <Briefcase className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">Career Goals</h3>
          </div>

          <div className="space-y-6 relative z-10">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Target Role</label>
              <input 
                name="target_role" 
                value={formData.target_role} 
                onChange={handleChange} 
                placeholder="e.g. Backend Developer" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all shadow-inner" 
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Target Package (LPA)</label>
              <input 
                name="target_package_lpa" 
                value={formData.target_package_lpa} 
                onChange={handleChange} 
                placeholder="e.g. 15" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-all shadow-inner" 
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="glass-card p-8 border border-white/5 bg-[#0a0a0a]/80 md:col-span-2 relative overflow-hidden group">
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-64 h-48 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/15 transition-all duration-500"></div>
          
          <div className="flex items-center gap-3 mb-8 relative z-10">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Code2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[12px] tracking-[0.15em] uppercase text-zinc-400">Preferences & Commitment</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Preferred Tech Stack (Comma separated)</label>
              <input 
                name="preferred_roles" 
                value={formData.preferred_roles} 
                onChange={handleChange} 
                placeholder="e.g. React, Node.js, Python, AWS" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all shadow-inner" 
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Dream Companies (Comma separated)</label>
              <input 
                name="preferred_companies" 
                value={formData.preferred_companies} 
                onChange={handleChange} 
                placeholder="e.g. Google, Atlassian, Stripe" 
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all shadow-inner" 
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold mb-2 block">Study Time Commitment (Hours/Day)</label>
              <input 
                name="daily_hours" 
                value={formData.daily_hours} 
                onChange={handleChange} 
                placeholder="e.g. 4" 
                className="w-full md:w-1/2 bg-black/50 border border-white/10 rounded-xl px-5 py-3 text-[14px] text-white focus:outline-none focus:border-emerald-500/50 focus:bg-emerald-500/5 transition-all shadow-inner" 
              />
            </div>
          </div>
        </div>

      </div>
    </PageTransition>
  )
}
