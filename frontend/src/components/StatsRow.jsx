import React from 'react'

export default function StatsRow({ totalFiles, codeFiles, totalChunks, issueCount }) {
  const StatCard = ({ label, value }) => (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col items-start justify-center">
      <span className="text-3xl font-bold text-white mb-1">{value ?? '—'}</span>
      <span className="text-sm font-medium text-secondary">{label}</span>
    </div>
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full">
      <StatCard label="Total Files" value={totalFiles} />
      <StatCard label="Files Audited" value={codeFiles} />
      <StatCard label="Chunks Indexed" value={totalChunks} />
      <StatCard label="Issues Found" value={issueCount} />
    </div>
  )
}
