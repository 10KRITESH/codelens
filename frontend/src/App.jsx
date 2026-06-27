import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import AuditForm from './components/AuditForm'
import ProgressBar from './components/ProgressBar'
import ReportView from './components/ReportView'
import { AlertCircle } from 'lucide-react'

function App() {
  const [state, setState] = useState('idle') // idle, loading, complete, error
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const startAudit = async (repoUrl) => {
    setState('loading')
    setProgress(0)
    setError(null)

    try {
      // 1. POST to start audit
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start audit')
      }

      // 2. If cached, skip polling
      if (data.status === 'cached') {
        setResult({
          report: data.report,
          totalFiles: data.totalFiles,
          codeFiles: data.codeFiles,
          totalChunks: data.totalChunks
        })
        setState('complete')
        return
      }

      // 3. Poll until complete
      const jobId = data.jobId
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/status/${jobId}`)
          const statusData = await statusRes.json()

          if (!statusRes.ok) throw new Error(statusData.error || 'Failed to get status')

          setProgress(statusData.progress || 0)

          if (statusData.status === 'completed') {
            clearInterval(interval)
            setResult(statusData.result)
            setState('complete')
          } else if (statusData.status === 'failed') {
            clearInterval(interval)
            setError(statusData.error || 'Audit job failed')
            setState('error')
          }
        } catch (err) {
          clearInterval(interval)
          setError(err.message)
          setState('error')
        }
      }, 2000)

      // Cleanup on unmount handled in theory, but in this simple app we let it run
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  const resetState = () => {
    setState('idle')
    setProgress(0)
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col items-center p-6">
        {state === 'idle' && (
          <AuditForm onSubmit={startAudit} isLoading={false} />
        )}

        {state === 'loading' && (
          <div className="w-full">
            <AuditForm onSubmit={() => {}} isLoading={true} />
            <ProgressBar progress={progress} />
          </div>
        )}

        {state === 'complete' && result && (
          <ReportView result={result} onReset={resetState} />
        )}

        {state === 'error' && (
          <div className="w-full max-w-2xl mx-auto mt-20 p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center animate-in fade-in">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Audit Failed</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <button
              onClick={resetState}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
