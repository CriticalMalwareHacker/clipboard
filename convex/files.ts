import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Save a file record after a successful S3 upload
export const saveFile = mutation({
    args: {
        roomId: v.id('rooms'),
        name: v.string(),
        size: v.number(),
        type: v.string(),
        objectKey: v.string(),
    },
    handler: async (ctx, { roomId, name, size, type, objectKey }) => {
        const fileId = await ctx.db.insert('files', {
            roomId,
            name,
            size,
            type,
            objectKey,
            uploadedAt: Date.now(),
        })
        return fileId
    },
})

// Get all files for a room — reactive, real-time sync
export const getFiles = query({
    args: { roomId: v.id('rooms') },
    handler: async (ctx, { roomId }) => {
        return await ctx.db
            .query('files')
            .withIndex('by_room', (q) => q.eq('roomId', roomId))
            .order('desc')
            .collect()
    },
})

// Delete a file record from Convex (S3 object is NOT deleted here)
export const deleteFile = mutation({
    args: { fileId: v.id('files') },
    handler: async (ctx, { fileId }) => {
        await ctx.db.delete(fileId)
    },
})
