import React from 'react'

export default function ScoreCard({ score }) {
  let colorClass = 'text-green-500'
  let bgClass = 'bg-green-500/10'
  let borderClass = 'border-green-500/20'
  
  if (score < 40) {
    colorClass = 'text-red-500'
    bgClass = 'bg-red-500/10'
    borderClass = 'border-red-500/20'
  } else if (score <= 70) {
    colorClass = 'text-amber-500'
    bgClass = 'bg-amber-500/10'
    borderClass = 'border-amber-500/20'
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border ${borderClass} ${bgClass} transition-colors duration-500 h-full`}>
      <h3 className="text-secondary text-sm font-semibold uppercase tracking-wider mb-2">Security Score</h3>
      <div className="flex items-baseline gap-1">
        <span className={`text-6xl font-bold tracking-tighter ${colorClass}`}>{score}</span>
        <span className="text-xl text-secondary font-medium">/100</span>
      </div>
    </div>
  )
}
