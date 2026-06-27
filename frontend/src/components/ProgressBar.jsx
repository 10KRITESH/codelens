import React from 'react'

export default function ProgressBar({ progress }) {
  // Derive status text from progress
  let statusText = "Initializing..."
  if (progress > 0 && progress <= 10) statusText = "Fetching repository files..."
  else if (progress > 10 && progress <= 80) statusText = "Embedding and indexing code chunks..."
  else if (progress > 80 && progress <= 95) statusText = "Running AI audit..."
  else if (progress > 95) statusText = "Finalizing report..."

  return (
    <div className="w-full max-w-2xl mx-auto mt-24 flex flex-col items-center">
      <div className="w-full h-2 bg-border rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex justify-between w-full text-sm font-medium">
        <span className="text-secondary animate-pulse">{statusText}</span>
        <span className="text-white">{progress}%</span>
      </div>
    </div>
  )
}
