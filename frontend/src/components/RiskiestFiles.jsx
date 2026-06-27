import React from 'react'
import { AlertTriangle } from 'lucide-react'

export default function RiskiestFiles({ files }) {
  if (!files || files.length === 0) return null

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Riskiest Files</h3>
      <div className="flex flex-col gap-3">
        {files.map((file, index) => (
          <div 
            key={index} 
            className="flex items-center gap-3 p-3 rounded-lg bg-[#0d0d0d] border border-border border-l-2 border-l-amber-500 hover:border-l-red-500 transition-colors"
          >
            <span className="text-secondary font-mono text-sm w-4">{index + 1}.</span>
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span className="font-mono text-sm text-gray-200 truncate" title={file}>{file}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
