'use client'

import { motion } from 'framer-motion'

type AIState = 'idle' | 'analyzing' | 'thinking' | 'connecting' | 'finalizing' | 'complete'

interface AIVisualizerProps {
  state: AIState
}

export function AIVisualizer({ state }: AIVisualizerProps) {
  // Define animation properties based on the state
  const states = {
    idle: {
      scale: 1,
      opacity: 0.3,
      rotate: 0,
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      boxShadow: '0 0 0px rgba(255,255,255,0)'
    },
    analyzing: {
      scale: [1, 1.2, 1],
      opacity: [0.5, 0.8, 0.5],
      rotate: 180,
      borderRadius: ['50%', '40%', '50%'],
      backgroundColor: 'rgba(59, 130, 246, 0.4)', // Blue
      boxShadow: '0 0 40px rgba(59,130,246,0.5)',
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
    },
    thinking: {
      scale: [1, 1.1, 1],
      opacity: [0.6, 1, 0.6],
      rotate: -180,
      borderRadius: ['40%', '50%', '30%'],
      backgroundColor: 'rgba(168, 85, 247, 0.4)', // Purple
      boxShadow: '0 0 50px rgba(168,85,247,0.6)',
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
    },
    connecting: {
      scale: [1, 1.3, 1],
      opacity: [0.7, 0.9, 0.7],
      rotate: 360,
      borderRadius: '50%',
      backgroundColor: 'rgba(16, 185, 129, 0.4)', // Emerald
      boxShadow: '0 0 60px rgba(16,185,129,0.5)',
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    },
    finalizing: {
      scale: [1, 1.5, 1],
      opacity: [0.8, 1, 0.8],
      rotate: [0, 180, 360],
      borderRadius: ['50%', '30%', '50%'],
      backgroundColor: 'rgba(245, 158, 11, 0.5)', // Amber/Gold
      boxShadow: '0 0 80px rgba(245,158,11,0.7)',
      transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
    },
    complete: {
      scale: 1,
      opacity: 0.8,
      rotate: 0,
      borderRadius: '50%',
      backgroundColor: 'rgba(16, 185, 129, 0.2)', // Soft Emerald
      boxShadow: '0 0 30px rgba(16,185,129,0.3)',
      transition: { duration: 0.5 }
    }
  }

  const activeState = states[state] || states.idle

  return (
    <div className="relative flex items-center justify-center w-full h-48 sm:h-64 overflow-hidden rounded-xl bg-black/40 border border-white/5">
      
      {/* Dynamic Background Glow */}
      <motion.div 
        className="absolute inset-0 z-0 blur-[80px]"
        animate={{ backgroundColor: activeState.backgroundColor as string }}
        transition={{ duration: 1 }}
      />
      
      {/* Outer Rotating Ring */}
      <motion.div
        className="absolute w-40 h-40 sm:w-48 sm:h-48 border border-white/10 rounded-full z-10"
        animate={{ rotate: 360, scale: state === 'idle' ? 1 : 1.1 }}
        transition={{ duration: state === 'finalizing' ? 3 : 8, repeat: Infinity, ease: "linear" }}
        style={{ borderTopColor: 'rgba(255,255,255,0.3)', borderRightColor: 'transparent' }}
      />
      
      {/* Inner Rotating Ring */}
      <motion.div
        className="absolute w-28 h-28 sm:w-32 sm:h-32 border border-white/10 rounded-full z-10"
        animate={{ rotate: -360, scale: state === 'idle' ? 1 : 1.05 }}
        transition={{ duration: state === 'finalizing' ? 2 : 5, repeat: Infinity, ease: "linear" }}
        style={{ borderBottomColor: 'rgba(255,255,255,0.4)', borderLeftColor: 'transparent' }}
      />

      {/* Core Orb */}
      <motion.div
        className="relative z-20 w-16 h-16 sm:w-20 sm:h-20"
        animate={activeState as any}
      >
        {/* Core Center Dot */}
        <div className="absolute inset-0 m-auto w-4 h-4 rounded-full bg-white shadow-[0_0_10px_#fff]" />
      </motion.div>
      
      {/* Overlay Scanline effect (subtle) */}
      <div className="absolute inset-0 z-30 pointer-events-none bg-white/5 opacity-50 mix-blend-overlay"></div>
    </div>
  )
}
