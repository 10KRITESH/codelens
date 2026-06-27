import React from 'react'

export default function IssueFilters({ activeFilter, onFilterChange, counts }) {
  const tabs = [
    { id: 'all', label: 'All', count: counts.all, colorClass: 'bg-border text-gray-300' },
    { id: 'high', label: 'High', count: counts.high, colorClass: 'bg-red-500/20 text-red-500' },
    { id: 'medium', label: 'Medium', count: counts.medium, colorClass: 'bg-amber-500/20 text-amber-500' },
    { id: 'low', label: 'Low', count: counts.low, colorClass: 'bg-green-500/20 text-green-500' },
  ]

  return (
    <div className="flex items-center gap-2 border-b border-border pb-4 mb-6 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onFilterChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
            ${activeFilter === tab.id 
              ? 'bg-accent/10 text-accent border border-accent/30' 
              : 'bg-transparent text-secondary hover:bg-surface border border-transparent'
            }`}
        >
          {tab.label}
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.colorClass}`}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  )
}
