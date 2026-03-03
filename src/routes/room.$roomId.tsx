import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useState, useEffect, useCallback } from 'react'
import {
    Copy,
    Check,
    Clipboard,
    Trash2,
    Users,
    ArrowLeft,
    Link2,
} from 'lucide-react'
import TextareaWithFloatingLabel from '@/components/shadcn-space/textarea/textarea-07'

export const Route = createFileRoute('/room/$roomId')({
    component: SharedRoomPage,
})

function SharedRoomPage() {
    const { roomId } = Route.useParams()
    const navigate = useNavigate()

    const room = useQuery(api.rooms.getRoom, {
        roomId: roomId as Id<'rooms'>,
    })

    const updateContent = useMutation(api.rooms.updateContent)

    const [localText, setLocalText] = useState('')
    const [copied, setCopied] = useState(false)
    const [codeCopied, setCodeCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)

    // Sync from Convex → local IF remote changed (avoid cursor jump on own edits)
    useEffect(() => {
        if (room && room.content !== localText) {
            setLocalText(room.content)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [room?.content])

    // Debounced push to Convex
    const pushUpdate = useCallback(
        (value: string) => {
            updateContent({ roomId: roomId as Id<'rooms'>, content: value })
        },
        [roomId, updateContent],
    )

    useEffect(() => {
        const timer = setTimeout(() => {
            if (room && localText !== room.content) {
                pushUpdate(localText)
            }
        }, 300)
        return () => clearTimeout(timer)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localText])

    const handleCopy = async () => {
        if (localText.trim()) {
            await navigator.clipboard.writeText(localText)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handlePaste = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText()
            setLocalText(clipboardText)
            pushUpdate(clipboardText)
        } catch (err) {
            console.error('Failed to read clipboard:', err)
        }
    }

    const handleClear = () => {
        setLocalText('')
        pushUpdate('')
    }

    const handleCopyCode = async () => {
        if (room?.inviteCode) {
            await navigator.clipboard.writeText(room.inviteCode)
            setCodeCopied(true)
            setTimeout(() => setCodeCopied(false), 2000)
        }
    }

    const handleCopyLink = async () => {
        const url = `${window.location.origin}/room/${roomId}`
        await navigator.clipboard.writeText(url)
        setLinkCopied(true)
        setTimeout(() => setLinkCopied(false), 2000)
    }

    if (room === undefined) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Connecting to room…</p>
                </div>
            </div>
        )
    }

    if (room === null) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center gap-4">
                <p className="text-2xl font-bold text-gray-800">Room not found</p>
                <button
                    onClick={() => navigate({ to: '/' })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Home
                </button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
            <div className="w-full max-w-2xl">

                {/* Back button */}
                <button
                    onClick={() => navigate({ to: '/' })}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-2xl mb-4 shadow-lg shadow-gray-400/30">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-800 mb-2">Shared Room</h1>
                    <p className="text-gray-500">Changes sync instantly with everyone in this room</p>
                </div>

                {/* Invite bar */}
                <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 mb-4 shadow-md flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Invite Code</span>
                        <span className="text-2xl font-bold tracking-[0.25em] text-gray-800 font-mono">
                            {room.inviteCode}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCopyCode}
                            title="Copy invite code"
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                        >
                            {codeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            {codeCopied ? 'Copied!' : 'Code'}
                        </button>
                        <button
                            onClick={handleCopyLink}
                            title="Copy shareable link"
                            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-all"
                        >
                            {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
                            {linkCopied ? 'Copied!' : 'Link'}
                        </button>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl">

                    {/* Live indicator */}
                    <div className="flex items-center gap-2 mb-4">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                        </span>
                        <span className="text-xs text-green-600 font-semibold uppercase tracking-wide">Live sync active</span>
                    </div>

                    <TextareaWithFloatingLabel
                        value={localText}
                        onChange={(e) => setLocalText(e.target.value)}
                        label="Shared clipboard"
                    />

                    {/* Character Count */}
                    <div className="flex justify-between items-center mt-3 mb-4 text-sm text-gray-400">
                        <span>{localText.length} characters</span>
                        <span>{localText.trim().split(/\s+/).filter(Boolean).length} words</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={handleCopy}
                            disabled={!localText.trim()}
                            className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${copied
                                    ? 'bg-green-500 text-white shadow-lg shadow-green-300/40'
                                    : localText.trim()
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
                            disabled={!localText}
                            className={`flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${localText
                                    ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 hover:scale-[1.02]'
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                        >
                            <Trash2 className="w-5 h-5" /> Clear
                        </button>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-sm mt-6">
                    Share the code or link above — anyone who joins sees your text instantly.
                </p>
            </div>
        </div>
    )
}
