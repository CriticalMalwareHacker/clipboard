import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
    rooms: defineTable({
        inviteCode: v.string(),   // 6-char uppercase code e.g. "XKCD42"
        content: v.string(),      // shared clipboard text
        createdAt: v.number(),    // timestamp
    }).index('by_invite_code', ['inviteCode']),
})
