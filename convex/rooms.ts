import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Generate a random 6-character uppercase invite code
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusable chars
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

// Create a new room — returns the room ID and invite code
export const createRoom = mutation({
    args: {},
    handler: async (ctx) => {
        let inviteCode = generateCode()

        // Ensure uniqueness
        let existing = await ctx.db
            .query('rooms')
            .withIndex('by_invite_code', (q) => q.eq('inviteCode', inviteCode))
            .first()

        while (existing) {
            inviteCode = generateCode()
            existing = await ctx.db
                .query('rooms')
                .withIndex('by_invite_code', (q) => q.eq('inviteCode', inviteCode))
                .first()
        }

        const roomId = await ctx.db.insert('rooms', {
            inviteCode,
            content: '',
            createdAt: Date.now(),
        })

        return { roomId, inviteCode }
    },
})

// Join a room by invite code — returns the room ID
export const joinByCode = query({
    args: { inviteCode: v.string() },
    handler: async (ctx, { inviteCode }) => {
        const room = await ctx.db
            .query('rooms')
            .withIndex('by_invite_code', (q) =>
                q.eq('inviteCode', inviteCode.toUpperCase().trim()),
            )
            .first()

        if (!room) return null
        return { roomId: room._id, inviteCode: room.inviteCode }
    },
})

// Get a room by its ID (used for real-time subscription)
export const getRoom = query({
    args: { roomId: v.id('rooms') },
    handler: async (ctx, { roomId }) => {
        return await ctx.db.get(roomId)
    },
})

// Update the shared clipboard content
export const updateContent = mutation({
    args: {
        roomId: v.id('rooms'),
        content: v.string(),
    },
    handler: async (ctx, { roomId, content }) => {
        await ctx.db.patch(roomId, { content })
    },
})
