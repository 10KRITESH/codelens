import React from 'react'
import IssueCard from './IssueCard'
import { CheckCircle2 } from 'lucide-react'

export default function IssueList({ issues, filter }) {
  const filteredIssues = filter === 'all' 
    ? issues 
    : issues.filter(i => i.severity?.toLowerCase() === filter)

  // Group by severity
  const high = filteredIssues.filter(i => i.severity?.toLowerCase() === 'high')
  const medium = filteredIssues.filter(i => i.severity?.toLowerCase() === 'medium')
  const low = filteredIssues.filter(i => i.severity?.toLowerCase() === 'low')

  if (filteredIssues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-surface border border-border rounded-xl">
        <CheckCircle2 size={48} className="text-green-500 mb-4 opacity-80" />
        <h3 className="text-xl font-semibold text-white mb-2">No issues found</h3>
        <p className="text-secondary text-center">Great job! There are no issues matching this filter.</p>
      </div>
    )
  }

  const renderGroup = (groupIssues, title) => {
    if (groupIssues.length === 0) return null
    return (
      <div className="mb-8">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          {title} <span className="text-secondary text-sm font-normal">({groupIssues.length})</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groupIssues.map((issue, idx) => (
            <IssueCard key={`${issue.file}-${idx}`} issue={issue} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {renderGroup(high, 'High Severity')}
      {renderGroup(medium, 'Medium Severity')}
      {renderGroup(low, 'Low Severity')}
    </div>
  )
}
