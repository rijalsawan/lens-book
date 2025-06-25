import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        console.log(`SSE connection established for user: ${userId}`)

        // Send initial connection message
        const sendMessage = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`
          try {
            controller.enqueue(new TextEncoder().encode(message))
          } catch (error) {
            console.log('SSE connection closed')
          }
        }

        // Send connection confirmation
        sendMessage({ 
          type: 'connected', 
          message: 'SSE connection established',
          timestamp: new Date().toISOString()
        })

        // Keep track of last notification check
        let lastCheck = new Date()

        // Poll for new notifications every 3 seconds
        const pollInterval = setInterval(async () => {
          try {
            // Check for new notifications since last check
            const newNotifications = await prisma.notification.findMany({
              where: {
                userId: userId,
                createdAt: {
                  gt: lastCheck
                }
              },
              include: {
                actionUser: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    avatar: true
                  }
                },
                photo: {
                  select: {
                    id: true,
                    url: true,
                    title: true
                  }
                },
                comment: {
                  select: {
                    id: true,
                    content: true
                  }
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            })

            if (newNotifications.length > 0) {
              // Transform notifications to match your existing format
              const transformedNotifications = newNotifications.map(notification => ({
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                isRead: notification.isRead,
                createdAt: notification.createdAt.toISOString(),
                data: {
                  actionUserId: notification.actionUserId,
                  actionUserName: notification.actionUser?.name || notification.actionUser?.username,
                  actionUserAvatar: notification.actionUser?.avatar,
                  photoId: notification.photoId,
                  photoUrl: notification.photo?.url,
                  photoTitle: notification.photo?.title,
                  commentId: notification.commentId,
                  commentContent: notification.comment?.content
                }
              }))

              // Send each notification
              transformedNotifications.forEach(notification => {
                sendMessage({
                  type: 'new-notification',
                  notification: notification
                })
              })

              // Update last check time
              lastCheck = new Date()
            }

            // Send heartbeat every 30 seconds to keep connection alive
            if (Date.now() % 30000 < 3000) {
              sendMessage({ 
                type: 'heartbeat', 
                timestamp: new Date().toISOString() 
              })
            }

          } catch (error) {
            console.error('SSE polling error:', error)
            sendMessage({
              type: 'error',
              message: 'Error checking for notifications'
            })
          }
        }, 3000) // Poll every 3 seconds

        // Send unread count every 10 seconds
        const unreadCountInterval = setInterval(async () => {
          try {
            const unreadCount = await prisma.notification.count({
              where: {
                userId: userId,
                isRead: false
              }
            })

            sendMessage({
              type: 'unread-count',
              count: unreadCount
            })
          } catch (error) {
            console.error('Error getting unread count:', error)
          }
        }, 10000)

        // Cleanup when connection closes
        const cleanup = () => {
          clearInterval(pollInterval)
          clearInterval(unreadCountInterval)
          console.log(`SSE connection closed for user: ${userId}`)
        }

        // Listen for client disconnect
        request.signal.addEventListener('abort', cleanup)

        // Cleanup after 5 minutes to prevent memory leaks
        setTimeout(() => {
          cleanup()
          try {
            controller.close()
          } catch (error) {
            // Connection already closed
          }
        }, 5 * 60 * 1000) // 5 minutes
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
      }
    })

  } catch (error) {
    console.error('SSE setup error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
