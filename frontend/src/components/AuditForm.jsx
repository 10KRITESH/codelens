import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'

export default function AuditForm({ onSubmit, isLoading }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!url.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }
    
    if (!url.startsWith('https://github.com/')) {
      setError('URL must start with https://github.com/')
      return
    }

    onSubmit(url)
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-20 p-6 rounded-xl bg-surface border border-border shadow-xl">
      <h2 className="text-2xl font-semibold mb-2">Audit a Repository</h2>
      <p className="text-secondary mb-6">Enter a public GitHub repository URL to scan for vulnerabilities, bugs, and performance issues.</p>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-secondary" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            placeholder="https://github.com/owner/repo"
            className="w-full pl-10 pr-4 py-3 bg-[#0d0d0d] border border-border rounded-lg text-white placeholder-secondary/50 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
          />
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        
        <button
          type="submit"
          disabled={isLoading}
          className="mt-2 w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent hover:bg-accent/90 text-white font-medium rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Starting Audit...
            </>
          ) : (
            'Audit Repo'
          )}
        </button>
      </form>
    </div>
  )
}
