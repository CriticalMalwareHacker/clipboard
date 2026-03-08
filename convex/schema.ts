import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    rooms: defineTable({
        inviteCode: v.string(),      // 6-char uppercase code e.g. "XKCD42"
        content: v.string(),         // shared clipboard text
        createdAt: v.number(),       // timestamp
        lastActivityAt: v.number(),  // updated on every content change
    }).index('by_invite_code', ['inviteCode']),

    files: defineTable({
        roomId: v.id('rooms'),       // which room this file belongs to
        name: v.string(),            // original filename
        size: v.number(),            // bytes
        type: v.string(),            // MIME type
        objectKey: v.string(),       // S3 object key
        uploadedAt: v.number(),      // timestamp
    }).index('by_room', ['roomId']),
})

