import React from 'react'
import { Code2 } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-border bg-[#0d0d0d] px-6 py-4 flex items-center gap-3">
      <div className="flex items-center gap-2 text-accent">
        <Code2 size={28} strokeWidth={2.5} />
        <h1 className="text-xl font-bold tracking-tight text-white">CodeLens</h1>
      </div>
      <div className="w-px h-6 bg-border mx-2"></div>
      <p className="text-sm text-secondary font-medium">AI-powered code audit</p>
    </header>
  )
}
