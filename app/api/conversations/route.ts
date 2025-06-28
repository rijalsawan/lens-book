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
    const cacheKey = `conversations:${userId}`
    const cachedData = apiCache.get(cacheKey)
    if (cachedData) {
      return NextResponse.json({ conversations: cachedData })
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true
              }
            },
            reads: {
              where: {
                userId
              },
              select: {
                userId: true
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 50 // Limit to 50 conversations max
    })

    const formattedConversations = conversations.map((conv: any) => {
      const lastMessage = conv.messages[0]
      const participants = conv.participants.map((p: any) => p.user).filter((u: any) => u.id !== userId)
      
      // Count unread messages for this conversation
      const unreadMessages = conv.messages.filter((msg: any) => 
        msg.sender.id !== userId && 
        msg.reads.length === 0
      )

      return {
        id: conv.id,
        participants,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          sender: lastMessage.sender,
          isRead: lastMessage.reads.length > 0
        } : null,
        unreadCount: unreadMessages.length,
        updatedAt: conv.updatedAt
      }
    })

    // Cache the results for 30 seconds
    apiCache.set(cacheKey, formattedConversations, 30)

    return NextResponse.json({ conversations: formattedConversations })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
