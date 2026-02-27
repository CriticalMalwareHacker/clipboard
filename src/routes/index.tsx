import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Copy, Check, Clipboard, Trash2 } from 'lucide-react'
import TextareaWithFloatingLabel from '@/components/shadcn-space/textarea/textarea-07'

export const Route = createFileRoute('/')({ component: ClipboardApp })

function ClipboardApp() {
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (text.trim()) {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePaste = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText()
      setText(clipboardText)
    } catch (err) {
      console.error('Failed to read clipboard:', err)
    }
  }

  const handleClear = () => {
    setText('')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-2xl mb-4 shadow-lg shadow-gray-400/30">
            <Clipboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Clipboard</h1>
          <p className="text-gray-500">Quick copy &amp; paste text storage</p>
        </div>

        {/* Main Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
          {/* Floating Label Textarea */}
          <TextareaWithFloatingLabel
            value={text}
            onChange={(e) => setText(e.target.value)}
            label="Your text"
          />

          {/* Character Count */}
          <div className="flex justify-between items-center mt-3 mb-4 text-sm text-gray-400">
            <span>{text.length} characters</span>
            <span>{text.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopy}
              disabled={!text.trim()}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${copied
                  ? 'bg-green-500 text-white shadow-lg shadow-green-300/40'
                  : text.trim()
                    ? 'bg-gray-800 text-white hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-400/30 hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={handlePaste}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
            >
              <Clipboard className="w-5 h-5" />
              Paste
            </button>

            <button
              onClick={handleClear}
              disabled={!text}
              className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${text
                  ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:scale-[1.02]'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
            >
              <Trash2 className="w-5 h-5" />
              Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Your text stays in your browser. Nothing is sent to any server.
        </p>
      </div>
    </div>
  )
}
