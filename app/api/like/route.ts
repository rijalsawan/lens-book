import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"
import { deleteNotificationsByAction } from '../../../utils/notificationCleanup'


export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' }, 
                { status: 401 }
            )
        }

        const body = await request.json()
        const { photoId } = body

        if (!photoId) {
            return NextResponse.json(
                { success: false, error: 'Photo ID is required' }, 
                { status: 400 }
            )
        }

        // Check if photo exists
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
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
        })

        if (!photo) {
            return NextResponse.json(
                { success: false, error: 'Photo not found' }, 
                { status: 404 }
            )
        }

        // Check if user already liked this photo
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_photoId: {
                    userId,
                    photoId
                }
            }
        })

        // Get current user info for notifications
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true
            }
        })

        if (!currentUser) {
            return NextResponse.json(
                { success: false, error: 'User not found' }, 
                { status: 404 }
            )
        }

        if (existingLike) {
            // Unlike the photo
            await prisma.$transaction(async (tx) => {
                // Remove the like
                await tx.like.delete({
                    where: { id: existingLike.id }
                })

                // Update photo like count
                await tx.photo.update({
                    where: { id: photoId },
                    data: {
                        likeCount: {
                            decrement: 1
                        }
                    }
                })
            })

            await deleteNotificationsByAction({
                actionUserId: userId,
                type: 'like',
                photoId
            })

            // Get updated like count
            const updatedLikeCount = await prisma.like.count({
                where: { photoId }
            })

            return NextResponse.json({
                success: true,
                liked: false,
                likeCount: updatedLikeCount,
                message: 'Photo unliked successfully',
                notificationsDeleted: true
            })

        } else {
            // Like the photo
            let newLike
            let notification: any = null

            await prisma.$transaction(async (tx) => {
                // Create the like
                newLike = await tx.like.create({
                    data: {
                        userId,
                        photoId
                    }
                })

                // Update photo like count
                await tx.photo.update({
                    where: { id: photoId },
                    data: {
                        likeCount: {
                            increment: 1
                        }
                    }
                })

                // Create notification only if user is not liking their own photo
                if (photo.userId !== userId) {
                    try {
                        // Check if a similar notification already exists within the last hour
                        const existingNotification = await tx.notification.findFirst({
                            where: {
                                userId: photo.userId,
                                actionUserId: userId,
                                type: 'like',
                                photoId,
                                createdAt: {
                                    gte: new Date(Date.now() - 60 * 60 * 1000) // Within last hour
                                }
                            }
                        })

                        if (!existingNotification) {
                            // Create new notification
                            notification = await tx.notification.create({
                                data: {
                                    userId: photo.userId, // Photo owner receives the notification
                                    actionUserId: userId, // Current user performed the action
                                    type: 'like',
                                    title: 'New Like',
                                    message: `${currentUser.name || currentUser.username} liked your photo${photo.title ? ` "${photo.title}"` : ''}`,
                                    photoId,
                                    isRead: false
                                }
                            })
                        } else {
                            // Update existing notification to mark as unread and update timestamp
                            notification = await tx.notification.update({
                                where: { id: existingNotification.id },
                                data: {
                                    message: `${currentUser.name || currentUser.username} liked your photo${photo.title ? ` "${photo.title}"` : ''}`,
                                    isRead: false,
                                    updatedAt: new Date()
                                }
                            })
                        }
                    } catch (notificationError) {
                        // Ignore if notification table doesn't exist yet
                        console.log('Could not create like notification:', notificationError)
                    }
                }
            })

            // Get updated like count
            const updatedLikeCount = await prisma.like.count({
                where: { photoId }
            })

            return NextResponse.json({
                success: true,
                liked: true,
                likeCount: updatedLikeCount,
                message: 'Photo liked successfully',
                notification: notification ? {
                    id: notification.id,
                    created: true
                } : null
            })
        }

    } catch (error) {
        console.error('Error in like API:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' }, 
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth()
        const { searchParams } = new URL(request.url)
        const photoId = searchParams.get('photoId')

        if (!photoId) {
            return NextResponse.json(
                { success: false, error: 'Photo ID is required' }, 
                { status: 400 }
            )
        }

        // Get like count for the photo
        const likeCount = await prisma.like.count({
            where: { photoId }
        })

        // Check if current user liked this photo (if authenticated)
        let isLiked = false
        if (userId) {
            const userLike = await prisma.like.findUnique({
                where: {
                    userId_photoId: {
                        userId,
                        photoId
                    }
                }
            })
            isLiked = !!userLike
        }

        // Get recent likes with user info for display
        const recentLikes = await prisma.like.findMany({
            where: { photoId },
            take: 10,
            orderBy: { createdAt: 'desc' },
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
        })

        return NextResponse.json({
            success: true,
            likeCount,
            isLiked,
            recentLikes: recentLikes.map(like => ({
                id: like.id,
                createdAt: like.createdAt,
                user: like.user
            }))
        })

    } catch (error) {
        console.error('Error fetching likes:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' }, 
            { status: 500 }
        )
    }
}