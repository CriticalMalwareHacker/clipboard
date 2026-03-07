import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Run every minute — delete rooms inactive for 10+ minutes
crons.interval(
    'delete stale rooms',
    { minutes: 1 },
    internal.rooms.deleteStaleRooms,
    { thresholdMs: 10 * 60 * 1000 }, // 10 minutes
)

export default crons
