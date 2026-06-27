import React from 'react'
import { FileCode2 } from 'lucide-react'

export default function IssueCard({ issue }) {
  const severityColors = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20'
  }

  const typeColors = {
    security: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    bug: 'bg-red-500/10 text-red-500 border-red-500/20',
    quality: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    performance: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }

  const sevColor = severityColors[issue.severity?.toLowerCase()] || severityColors.medium
  const typeColor = typeColors[issue.type?.toLowerCase()] || typeColors.quality

  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-border/80 transition-colors animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${sevColor}`}>
          {issue.severity}
        </span>
        <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider border ${typeColor}`}>
          {issue.type}
        </span>
      </div>
      
      <h4 className="text-lg font-semibold text-white mb-2 leading-tight">{issue.title}</h4>
      
      <div className="flex items-center gap-2 mb-3 text-sm text-secondary bg-[#0d0d0d] p-2 rounded-lg border border-border">
        <FileCode2 size={16} className="shrink-0" />
        <span className="font-mono truncate" title={`${issue.file}:${issue.lines}`}>
          {issue.file}<span className="text-gray-500">:{issue.lines}</span>
        </span>
      </div>
      
      <p className="text-gray-400 text-sm leading-relaxed">{issue.description}</p>
    </div>
  )
}
