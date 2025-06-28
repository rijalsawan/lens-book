import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { apiCache } from '@/lib/apiCache'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { userId } = await auth()
    const { conversationId } = await params
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { userId }
        }
      }
    })

    if (!conversation || conversation.participants.length === 0) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all unread messages in this conversation that are not sent by the current user
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
        senderId: { not: userId },
        reads: {
          none: {
            userId
          }
        }
      }
    })

    // Mark all unread messages as read
    if (unreadMessages.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadMessages.map(message => ({
          messageId: message.id,
          userId
        })),
        skipDuplicates: true
      })
    }

    // Invalidate relevant caches since read status changed (including messages for faster read receipts)
    apiCache.deleteByPrefix('conversations:')
    apiCache.deleteByPrefix('messages:')
    apiCache.deleteByPrefix('unread:')

    return NextResponse.json({ success: true, markedCount: unreadMessages.length })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
