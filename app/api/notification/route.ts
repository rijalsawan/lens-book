import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { createRateLimitMiddleware } from '@/lib/rateLimiter'

const rateLimitMiddleware = createRateLimitMiddleware(30, 60000) // 30 requests per minute

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitResult = rateLimitMiddleware(request, userId)
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { 
                    error: 'Rate limit exceeded', 
                    resetTime: rateLimitResult.resetTime 
                }, 
                { 
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                        'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
                    }
                }
            )
        }

        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50) // Limit max results
        const skip = (page - 1) * limit

        console.log(`Fetching notifications for user ${userId}, page ${page}`)

        // Use a single transaction to get all data efficiently
        const [notifications, totalCount, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: {
                    userId: userId
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
                },
                skip,
                take: limit
            }),
            prisma.notification.count({
                where: {
                    userId: userId
                }
            }),
            prisma.notification.count({
                where: {
                    userId: userId,
                    isRead: false
                }
            })
        ])

        // Transform notifications
        const transformedNotifications = notifications.map(notification => ({
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

        return NextResponse.json({
            success: true,
            notifications: transformedNotifications,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            },
            unreadCount
        })

    } catch (error) {
        console.error('Error fetching notifications:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch notifications' },
            { status: 500 }
        )
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { notificationId, markAsRead, markAllAsRead } = body

        if (markAllAsRead) {
            // Mark all notifications as read for the user
            await prisma.notification.updateMany({
                where: {
                    userId,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            })

            return NextResponse.json({
                success: true,
                message: 'All notifications marked as read'
            })
        } else if (notificationId) {
            // Mark specific notification as read/unread
            const notification = await prisma.notification.findFirst({
                where: {
                    id: notificationId,
                    userId // Ensure user owns this notification
                }
            })

            if (!notification) {
                return NextResponse.json(
                    { error: 'Notification not found' },
                    { status: 404 }
                )
            }

            await prisma.notification.update({
                where: { id: notificationId },
                data: { isRead: markAsRead }
            })

            return NextResponse.json({
                success: true,
                message: `Notification marked as ${markAsRead ? 'read' : 'unread'}`
            })
        } else {
            return NextResponse.json(
                { error: 'Invalid request parameters' },
                { status: 400 }
            )
        }

    } catch (error) {
        console.error('Error updating notification:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to update notification' },
            { status: 500 }
        )
    }
}