import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useState, useEffect, useCallback } from 'react'
import { formatBytes } from '@/components/ui/upload-progress'
import {
    Copy,
    Check,
    Clipboard,
    Trash2,
    Users,
    ArrowLeft,
    Link2,
    FileUp,
    Download,
    X,
    File as FileIcon2,
} from 'lucide-react'
import TextareaWithFloatingLabel from '@/components/shadcn-space/textarea/textarea-07'
import { UploadDropzone } from '@/components/ui/upload-dropzone'
import { UploadProgress } from '@/components/ui/upload-progress'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import {
    createDownloadSignedUrl,
    createUploadSignedUrls,
    uploadFileToSignedUrl,
} from '@/lib/file-storage.server'

type UploadProgressItem = {
    status: 'pending' | 'uploading' | 'complete' | 'failed'
    progress: number
    name: string
    size: number
    type: string
    objectInfo: {
        key: string
        metadata: Record<string, string>
        cacheControl?: string
    }
}

type UploadSignedUrlPayload = {
    metadata: Record<string, unknown>
    files: Array<{
        signedUrl: string
        headers: Record<string, string>
        file: {
            name: string
            size: number
            type: string
            objectInfo: {
                key: string
                metadata: Record<string, string>
                cacheControl?: string
            }
        }
        skip?: 'completed'
    }>
}

async function fileToBase64(file: File, onProgress?: (progress: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        
        if (onProgress) {
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    // File reading takes up to the first 30% of the visual progress loop
                    onProgress((event.loaded / event.total) * 0.3)
                }
            }
        }

        reader.onload = () => {
            const result = reader.result as string
            const base64 = result.split(',')[1]
            if (onProgress) onProgress(0.3)
            resolve(base64)
        }
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
    })
}

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
    const saveFile = useMutation(api.files.saveFile)
    const deleteFile = useMutation(api.files.deleteFile)
    const files = useQuery(api.files.getFiles, {
        roomId: roomId as Id<'rooms'>,
    })

    const [localText, setLocalText] = useState('')
    const [copied, setCopied] = useState(false)
    const [codeCopied, setCodeCopied] = useState(false)
    const [linkCopied, setLinkCopied] = useState(false)
    const [downloadingKey, setDownloadingKey] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgresses, setUploadProgresses] = useState<UploadProgressItem[]>([])

    const [previewItem, setPreviewItem] = useState<{ _id: string, objectKey: string, name: string, type: string, size: number } | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isLoadingPreview, setIsLoadingPreview] = useState(false)

    useEffect(() => {
        if (!previewItem) {
            setPreviewUrl(null)
            return
        }
        
        setIsLoadingPreview(true)
        createDownloadSignedUrl({ data: { key: previewItem.objectKey } })
            .then((res) => {
                setPreviewUrl(res.url)
            })
            .catch((err) => console.error("Failed to load preview:", err))
            .finally(() => setIsLoadingPreview(false))
    }, [previewItem])

    const updateUploadProgress = useCallback(
        (objectKey: string, patch: Partial<UploadProgressItem>) => {
            setUploadProgresses((prev) =>
                prev.map((item) =>
                    item.objectInfo.key === objectKey
                        ? {
                            ...item,
                            ...patch,
                        }
                        : item,
                ),
            )
        },
        [],
    )

    const uploadFiles = useCallback(
        async (filesToUpload: File[]) => {
            if (!filesToUpload.length || isUploading) {
                return
            }

            setIsUploading(true)

            try {
                const payload = (await createUploadSignedUrls({
                    data: {
                        route: 'roomFiles',
                        metadata: { roomId },
                        files: filesToUpload.map((file) => ({
                            name: file.name,
                            size: file.size,
                            type: file.type,
                        })),
                    },
                })) as UploadSignedUrlPayload & {
                    multipart?: unknown
                }

                if ('multipart' in payload) {
                    throw new Error('Multipart uploads are not supported in this upload flow')
                }

                setUploadProgresses(
                    payload.files.map((target) => ({
                        status: target.skip === 'completed' ? 'complete' : 'pending',
                        progress: target.skip === 'completed' ? 1 : 0,
                        name: target.file.name,
                        size: target.file.size,
                        type: target.file.type,
                        objectInfo: target.file.objectInfo,
                    })),
                )

                await Promise.all(
                    payload.files.map(async (target) => {
                        const rawFile = filesToUpload.find(
                            (file) =>
                                file.name === target.file.name &&
                                file.size === target.file.size &&
                                file.type === target.file.type,
                        )

                        if (!rawFile) {
                            updateUploadProgress(target.file.objectInfo.key, {
                                status: 'failed',
                            })
                            return
                        }

                        if (target.skip === 'completed') {
                            await saveFile({
                                roomId: roomId as Id<'rooms'>,
                                name: target.file.name,
                                size: target.file.size,
                                type: target.file.type,
                                objectKey: target.file.objectInfo.key,
                            })
                            return
                        }

                        updateUploadProgress(target.file.objectInfo.key, {
                            status: 'uploading',
                            progress: 0,
                        })

                        let progressInterval: ReturnType<typeof setInterval> | undefined

                        try {
                            const fileBase64 = await fileToBase64(rawFile, (p) => {
                                updateUploadProgress(target.file.objectInfo.key, {
                                    progress: p,
                                })
                            })

                            console.log('Upload target:', {
                                fileName: target.file.name,
                                signedUrl: target.signedUrl.substring(0, 50) + '...',
                                headers: target.headers,
                            })

                            // Simulate network upload progress smoothly up to 95%
                            let simulatedProgress = 0.3
                            progressInterval = setInterval(() => {
                                simulatedProgress += (0.95 - simulatedProgress) * 0.15
                                updateUploadProgress(target.file.objectInfo.key, {
                                    progress: simulatedProgress,
                                })
                            }, 300)

                            await uploadFileToSignedUrl({
                                data: {
                                    signedUrl: target.signedUrl,
                                    headers: target.headers,
                                    fileBase64,
                                    fileName: target.file.name,
                                },
                            })
                            
                            if (progressInterval) clearInterval(progressInterval)

                            updateUploadProgress(target.file.objectInfo.key, {
                                status: 'complete',
                                progress: 1,
                            })

                            await saveFile({
                                roomId: roomId as Id<'rooms'>,
                                name: target.file.name,
                                size: target.file.size,
                                type: target.file.type,
                                objectKey: target.file.objectInfo.key,
                            })
                        } catch (error) {
                            if (progressInterval) clearInterval(progressInterval)
                            console.error('Upload failed:', error)
                            updateUploadProgress(target.file.objectInfo.key, {
                                status: 'failed',
                            })
                        }
                    }),
                )
            } catch (error) {
                console.error('Failed to prepare upload:', error)
            } finally {
                setIsUploading(false)
            }
        },
        [isUploading, roomId, saveFile, updateUploadProgress],
    )

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

    const handleDownload = async (objectKey: string, name: string) => {
        setDownloadingKey(objectKey)
        try {
            const data = await createDownloadSignedUrl({ data: { key: objectKey } })
            if (data.url) {
                const a = document.createElement('a')
                a.href = data.url
                a.download = name
                a.click()
            }
        } catch (err) {
            console.error('Download failed:', err)
        } finally {
            setDownloadingKey(null)
        }
    }

    const handleDeleteFile = async (fileId: Id<'files'>) => {
        await deleteFile({ fileId })
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
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-2xl mb-2">
                    <span className="text-3xl">⏱</span>
                </div>
                <p className="text-2xl font-bold text-gray-800">Session Expired</p>
                <p className="text-gray-500 text-sm">This room was deleted after 10 minutes of inactivity.</p>
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
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6" suppressHydrationWarning>
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

                {/* Main Card - Clipboard */}
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

                {/* File Upload Card */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xl mt-4">
                    <div className="flex items-center gap-2 mb-4">
                        <FileUp className="w-5 h-5 text-gray-600" />
                        <h2 className="text-base font-semibold text-gray-800">Shared Files</h2>
                        {files && files.length > 0 && (
                            <span className="ml-auto text-xs text-gray-400 font-medium">
                                {files.length} file{files.length !== 1 ? 's' : ''}
                            </span>
                        )}
                    </div>

                    {/* Dropzone */}
                    <UploadDropzone
                        control={{
                            isPending: isUploading,
                            upload: async (incomingFiles) => {
                                const normalized = Array.from(incomingFiles)
                                await uploadFiles(normalized)
                                return {
                                    files: [],
                                    failedFiles: [],
                                    metadata: {},
                                }
                            },
                        }}
                        uploadOverride={(incomingFiles) => {
                            void uploadFiles(Array.from(incomingFiles))
                        }}
                        description={{
                            maxFiles: 10,
                            maxFileSize: '50MB',
                        }}
                    />

                    {/* Upload Progress */}
                    {uploadProgresses.length > 0 && (
                        <div className="mt-3">
                            <UploadProgress control={{ progresses: uploadProgresses }} />
                        </div>
                    )}

                    {/* Uploaded file list */}
                    {files && files.length > 0 && (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Uploaded</p>
                            {files.map((file) => (
                                <div
                                    key={file._id}
                                    onClick={() => setPreviewItem(file)}
                                    className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:border-gray-200 transition-all cursor-pointer hover:bg-gray-100/50"
                                >
                                    <FileIcon2 className="w-8 h-8 text-gray-400 shrink-0" strokeWidth={1.5} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                        <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(file.objectKey, file.name); }}
                                            disabled={downloadingKey === file.objectKey}
                                            title="Download"
                                            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-all disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteFile(file._id); }}
                                            title="Remove"
                                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="text-center text-gray-400 text-sm mt-6">
                    Share the code or link above — anyone who joins sees your text and files instantly.
                </p>
            </div>

            <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                <DialogContent className="max-w-4xl w-[90vw] h-[80vh] flex flex-col p-6">
                    <DialogHeader>
                        <DialogTitle className="truncate pr-6">{previewItem?.name}</DialogTitle>
                        <DialogDescription>
                            {previewItem && formatBytes(previewItem.size)} • {previewItem?.type}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="flex-1 min-h-0 relative border rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center">
                        {isLoadingPreview ? (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
                                <p className="text-gray-500 font-medium text-sm">Loading preview...</p>
                            </div>
                        ) : previewUrl ? (
                            previewItem?.type.startsWith('image/') ? (
                                <img 
                                    src={previewUrl} 
                                    alt={previewItem.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                            ) : previewItem?.type.startsWith('video/') ? (
                                <video 
                                    src={previewUrl} 
                                    controls 
                                    className="max-w-full max-h-full"
                                />
                            ) : previewItem?.type.startsWith('audio/') ? (
                                <audio 
                                    src={previewUrl} 
                                    controls 
                                    className="w-full max-w-md"
                                />
                            ) : (
                                <iframe 
                                    src={previewUrl} 
                                    className="w-full h-full border-0"
                                    title={previewItem?.name ?? 'preview'}
                                />
                            )
                        ) : (
                            <p className="text-gray-500">Failed to load preview</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
