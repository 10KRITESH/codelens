import React, { useState } from 'react'
import ScoreCard from './ScoreCard'
import StatsRow from './StatsRow'
import RiskiestFiles from './RiskiestFiles'
import IssueFilters from './IssueFilters'
import IssueList from './IssueList'
import { RotateCcw, RefreshCw } from 'lucide-react'

export default function ReportView({ result, onReset, onReAudit }) {
  const [filter, setFilter] = useState('all')

  const { report, totalFiles, codeFiles, totalChunks, failedFiles } = result || {}
  const { summary, issues = [], riskiestFiles = [], score = 0 } = report || {}

  const counts = {
    all: issues.length,
    high: issues.filter(i => i.severity?.toLowerCase() === 'high').length,
    medium: issues.filter(i => i.severity?.toLowerCase() === 'medium').length,
    low: issues.filter(i => i.severity?.toLowerCase() === 'low').length,
  }

  // Update document title
  React.useEffect(() => {
    document.title = `CodeLens — ${issues.length} issues found`
    return () => { document.title = 'CodeLens' }
  }, [issues.length])

  return (
    <div className="w-full max-w-6xl mx-auto mt-10 pb-20 px-4 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Audit Report</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onReAudit}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white border border-accent/30 rounded-lg transition-colors text-sm font-medium"
            title="Re-scan this repo with fresh data"
          >
            <RefreshCw size={16} />
            Re-Audit
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-surface hover:bg-border text-white border border-border rounded-lg transition-colors text-sm font-medium"
          >
            <RotateCcw size={16} />
            New Audit
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-1">
          <ScoreCard score={score} />
        </div>
        <div className="lg:col-span-2">
          <StatsRow 
            totalFiles={totalFiles} 
            codeFiles={codeFiles} 
            totalChunks={totalChunks} 
            issueCount={issues.length} 
          />
        </div>
      </div>

      {summary && (
        <div className="bg-surface border border-border rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-2">Summary</h3>
          <p className="text-gray-300 italic max-w-4xl leading-relaxed">{summary}</p>
        </div>
      )}

      {riskiestFiles.length > 0 && (
        <div className="mb-10">
          <RiskiestFiles files={riskiestFiles} />
        </div>
      )}

      <div>
        <IssueFilters activeFilter={filter} onFilterChange={setFilter} counts={counts} />
        <IssueList issues={issues} filter={filter} />
      </div>
    </div>
  )
}
