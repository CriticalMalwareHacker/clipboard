import { createServerFn } from '@tanstack/react-start'
import { Storage } from '@google-cloud/storage'

type UploadRequestPayload = {
    route: string
    metadata?: Record<string, any>
    files: Array<{
        name: string
        size: number
        type: string
    }>
}

function getBucketName() {
    const name = process.env['GCS_BUCKET_NAME']
    if (!name) {
        throw new Error('Missing required env var: GCS_BUCKET_NAME')
    }
    return name
}

// On Cloud Run, this automatically uses Application Default Credentials
// (the service account attached to the Cloud Run service). No keys needed.
function createStorage() {
    return new Storage()
}

export const createUploadSignedUrls = createServerFn({ method: 'POST' })
    .inputValidator((input: UploadRequestPayload) => input)
    .handler(async ({ data }) => {
        const bucketName = getBucketName()
        const storage = createStorage()
        const roomId = data.metadata?.roomId

        if (!roomId || typeof roomId !== 'string') {
            throw new Error('roomId is required in metadata')
        }

        const files = await Promise.all(
            data.files.map(async (file) => {
                const key =
                    'rooms/' +
                    roomId +
                    '/' +
                    Date.now() +
                    '-' +
                    file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

                const contentType = file.type || 'application/octet-stream'

                const [signedUrl] = await storage
                    .bucket(bucketName)
                    .file(key)
                    .getSignedUrl({
                        version: 'v4',
                        action: 'write',
                        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
                        contentType,
                    })

                return {
                    signedUrl,
                    headers: {
                        'Content-Type': contentType,
                    },
                    file: {
                        name: file.name,
                        size: file.size,
                        type: contentType,
                        objectInfo: {
                            key,
                            metadata: {},
                        },
                    },
                }
            }),
        )

        return {
            metadata: data.metadata,
            files,
        }
    })

type UploadFilePayload = {
    signedUrl: string
    headers: Record<string, string>
    fileBase64: string
    fileName: string
}

export const uploadFileToSignedUrl = createServerFn({ method: 'POST' })
    .inputValidator((input: UploadFilePayload) => input)
    .handler(async ({ data }) => {
        if (!data.signedUrl || !data.fileBase64) {
            throw new Error('signedUrl and fileBase64 are required')
        }

        const binaryString = atob(data.fileBase64)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i)
        }

        const headers: Record<string, string> = { ...data.headers }
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/octet-stream'
        }

        const response = await fetch(data.signedUrl, {
            method: 'PUT',
            headers,
            body: bytes,
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            console.error('Upload Error Response:', errorText)
            throw new Error(
                'Failed to upload file: ' +
                    response.status +
                    ' ' +
                    response.statusText +
                    (errorText ? ' - ' + errorText : ''),
            )
        }

        return { success: true }
    })

export const createDownloadSignedUrl = createServerFn({ method: 'POST' })
    .inputValidator((input: { key: string }) => input)
    .handler(async ({ data }) => {
        const key = data.key
        if (!key) {
            throw new Error('key is required')
        }

        const bucketName = getBucketName()
        const storage = createStorage()

        const [downloadUrl] = await storage
            .bucket(bucketName)
            .file(key)
            .getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 1 hour
            })

        return { url: downloadUrl }
    })