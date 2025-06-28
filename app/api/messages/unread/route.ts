import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { apiCache } from '@/lib/apiCache'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check cache first
    const cacheKey = `unread:${userId}`
    const cachedCount = apiCache.get(cacheKey)
    if (cachedCount !== null) {
      return NextResponse.json({ count: cachedCount })
    }

    // Count unread messages across all conversations
    const unreadCount = await prisma.message.count({
      where: {
        senderId: { not: userId },
        reads: {
          none: {
            userId
          }
        },
        conversation: {
          participants: {
            some: {
              userId
            }
          }
        }
      }
    })

    // Cache for 20 seconds
    apiCache.set(cacheKey, unreadCount, 20)

    return NextResponse.json({ count: unreadCount })
  } catch (error) {
    console.error('Error fetching unread messages count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
