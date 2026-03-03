import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Copy, Check, Clipboard, Trash2, Users, ArrowRight, Loader2 } from 'lucide-react'
import TextareaWithFloatingLabel from '@/components/shadcn-space/textarea/textarea-07'

export const Route = createFileRoute('/')({ component: ClipboardApp })

function ClipboardApp() {
  const navigate = useNavigate()

  // Local clipboard state
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)

  // Invite code join state
  const [inviteInput, setInviteInput] = useState('')
  const [joinError, setJoinError] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  // Convex
  const createRoom = useMutation(api.rooms.createRoom)
  const joinResult = useQuery(
    api.rooms.joinByCode,
    inviteInput.trim().length === 6
      ? { inviteCode: inviteInput.trim().toUpperCase() }
      : 'skip',
  )

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

  const handleClear = () => setText('')

  const handleCreateRoom = async () => {
    const { roomId } = await createRoom()
    navigate({ to: '/room/$roomId', params: { roomId } })
  }

  const handleJoinRoom = async () => {
    setJoinError('')
    setIsJoining(true)

    const code = inviteInput.trim().toUpperCase()
    if (code.length !== 6) {
      setJoinError('Enter a 6-character code')
      setIsJoining(false)
      return
    }

    if (joinResult === null) {
      setJoinError('Code not found — double check and try again')
      setIsJoining(false)
      return
    }

    if (joinResult) {
      navigate({
        to: '/room/$roomId',
        params: { roomId: joinResult.roomId },
      })
    } else {
      setJoinError('Checking code…')
    }
    setIsJoining(false)
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
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl mb-4">
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
                <><Check className="w-5 h-5" /> Copied!</>
              ) : (
                <><Copy className="w-5 h-5" /> Copy</>
              )}
            </button>

            <button
              onClick={handlePaste}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02]"
            >
              <Clipboard className="w-5 h-5" /> Paste
            </button>

            <button
              onClick={handleClear}
              disabled={!text}
              className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${text
                  ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:scale-[1.02]'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
            >
              <Trash2 className="w-5 h-5" /> Clear
            </button>
          </div>
        </div>

        {/* Share Section */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">
            Real-time sharing
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Create a room */}
            <button
              onClick={handleCreateRoom}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-gray-400/30"
            >
              <Users className="w-5 h-5" />
              Create shared room
            </button>

            {/* Divider */}
            <div className="flex items-center justify-center text-gray-300 font-semibold text-sm sm:px-1">or</div>

            {/* Join by code */}
            <div className="flex-1 flex gap-2">
              <input
                value={inviteInput}
                onChange={(e) => {
                  setInviteInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                  setJoinError('')
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter code…"
                maxLength={6}
                className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-xl font-mono font-semibold text-gray-800 tracking-[0.2em] text-center bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-800/20 focus:border-gray-800 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:font-normal"
              />
              <button
                onClick={handleJoinRoom}
                disabled={inviteInput.length !== 6 || isJoining}
                className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${inviteInput.length === 6
                    ? 'bg-gray-800 text-white hover:bg-gray-700 hover:scale-[1.02]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {isJoining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {joinError && (
            <p className="text-red-500 text-sm mt-2 font-medium">{joinError}</p>
          )}
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Your local text stays in your browser. Shared rooms sync via Convex.
        </p>
      </div>
    </div>
  )
}
