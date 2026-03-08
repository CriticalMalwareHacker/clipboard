import { createServerFn } from '@tanstack/react-start'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

type UploadRequestPayload = {
    route: string
    metadata?: Record<string, any>
    files: Array<{
        name: string
        size: number
        type: string
    }>
}

function getRequiredEnv(name: string) {
    const value = process.env[name]
    if (!value) {
        throw new Error('Missing required env var: ' + name)
    }
    return value
}

// AWS SDK natively supports the GCP HMAC keys out of the box
function createS3Client() {
    return new S3Client({
        region: 'auto',
        endpoint: 'https://storage.googleapis.com',
        credentials: {
            accessKeyId: getRequiredEnv('GCS_ACCESS_KEY'),
            secretAccessKey: getRequiredEnv('GCS_SECRET_KEY'),
        },
    })
}

export const createUploadSignedUrls = createServerFn({ method: 'POST' })
    .inputValidator((input: UploadRequestPayload) => input)
    .handler(async ({ data }) => {
        const s3Client = createS3Client()
        const bucketName = getRequiredEnv('GCS_BUCKET_NAME')
        const roomId = data.metadata?.roomId

        if (!roomId || typeof roomId !== 'string') {
            throw new Error('roomId is required in metadata')
        }

        const files = await Promise.all(
            data.files.map(async (file) => {
                const key = 'rooms/' + roomId + '/' + Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
                
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    ContentType: file.type || 'application/octet-stream',
                    ContentLength: file.size,
                })

                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
                
                return {
                    signedUrl,
                    headers: {
                        'Content-Type': file.type || 'application/octet-stream'
                    },
                    file: {
                        name: file.name,
                        size: file.size,
                        type: file.type || 'application/octet-stream',
                        objectInfo: {
                            key,
                            metadata: {},
                        }
                    }
                }
            })
        )

        return {
            metadata: data.metadata,
            files
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
                'Failed to upload file: ' + response.status + ' ' + response.statusText + (errorText ? ' - ' + errorText : '')
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

        const s3Client = createS3Client()
        const command = new GetObjectCommand({
            Bucket: getRequiredEnv('GCS_BUCKET_NAME'),
            Key: key,
        })

        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
        
        return { url: downloadUrl }
    })