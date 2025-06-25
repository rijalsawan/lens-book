import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const photoId = searchParams.get('photoId')

        console.log('GET /api/comments - photoId:', photoId) // Debug log

        if (!photoId) {
            return NextResponse.json(
                { success: false, error: 'Photo ID is required' },
                { status: 400 }
            )
        }

        // Fetch comments for the photo
        const comments = await prisma.comment.findMany({
            where: {
                photoId,
                parentId: null // Only top-level comments
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true
                    }
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        console.log('Found comments:', comments.length) // Debug log

        // Transform comments to match your interface
        const transformedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            text: comment.content, // For compatibility
            createdAt: comment.createdAt.toISOString(),
            user: comment.user,
            replies: comment.replies.map(reply => ({
                id: reply.id,
                content: reply.content,
                text: reply.content,
                createdAt: reply.createdAt.toISOString(),
                user: reply.user
            })),
            replyCount: comment.replies.length
        }))

        return NextResponse.json({
            success: true,
            comments: transformedComments
        })

    } catch (error) {
        console.error('Error fetching comments:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch comments' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('POST /api/comments - Starting request') // Debug log
        
        const { userId } = await auth()
        console.log('User ID:', userId) // Debug log
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        console.log('Request body:', body) // Debug log
        
        const { photoId, text, content } = body
        const commentText = text || content

        if (!photoId || !commentText) {
            return NextResponse.json(
                { success: false, error: 'Photo ID and comment text are required' },
                { status: 400 }
            )
        }

        console.log('Checking if photo exists:', photoId) // Debug log

        // Check if photo exists
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        })

        if (!photo) {
            console.log('Photo not found:', photoId) // Debug log
            return NextResponse.json(
                { success: false, error: 'Photo not found' },
                { status: 404 }
            )
        }

        console.log('Photo found, getting current user') // Debug log

        // Get current user info
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
            console.log('Current user not found:', userId) // Debug log
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            )
        }

        console.log('Creating comment in transaction') // Debug log

        // Create comment and update photo comment count in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the comment
            const newComment = await tx.comment.create({
                data: {
                    content: commentText,
                    photoId,
                    userId
                },
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

            console.log('Comment created:', newComment.id) // Debug log

            // Update photo comment count
            await tx.photo.update({
                where: { id: photoId },
                data: {
                    commentCount: {
                        increment: 1
                    }
                }
            })

            console.log('Photo comment count updated') // Debug log

            // Create notification if not commenting on own photo
            if (photo.userId !== userId) {
                try {
                    await tx.notification.create({
                        data: {
                            userId: photo.userId,
                            actionUserId: userId,
                            type: 'comment',
                            title: 'New Comment',
                            message: `${currentUser.name || currentUser.username} commented on your photo`,
                            photoId,
                            commentId: newComment.id,
                            isRead: false
                        }
                    })
                    console.log('Notification created') // Debug log
                } catch (notificationError) {
                    // Ignore notification errors for now if table doesn't exist
                    console.log('Notification creation failed - table may not exist yet:', notificationError)
                }
            }

            return newComment
        })

        console.log('Transaction completed successfully') // Debug log

        // Transform the comment to match your interface
        const transformedComment = {
            id: result.id,
            content: result.content,
            text: result.content,
            createdAt: result.createdAt.toISOString(),
            user: result.user,
            replies: [],
            replyCount: 0
        }

        console.log('Returning success response') // Debug log

        return NextResponse.json({
            success: true,
            comment: transformedComment,
            message: 'Comment added successfully'
        })

    } catch (error) {
        console.error('Error creating comment:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create comment: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { replyId } = body

        if (!replyId) {
            return NextResponse.json(
                { success: false, error: 'Reply ID is required' },
                { status: 400 }
            )
        }

        // Get reply details before deletion
        const reply = await prisma.comment.findUnique({
            where: { id: replyId },
            include: {
                photo: {
                    select: {
                        id: true,
                        userId: true
                    }
                },
                parent: {
                    select: {
                        id: true,
                        userId: true
                    }
                }
            }
        })

        if (!reply) {
            return NextResponse.json(
                { success: false, error: 'Reply not found' },
                { status: 404 }
            )
        }

        // Check if user can delete this reply
        const canDelete = reply.userId === userId || 
                         reply.photo.userId === userId || 
                         reply.parent?.userId === userId

        if (!canDelete) {
            return NextResponse.json(
                { success: false, error: 'You can only delete your own replies' },
                { status: 403 }
            )
        }

        // Delete reply and update counts in a transaction
        await prisma.$transaction(async (tx) => {
            // 🔥 DELETE REPLY NOTIFICATIONS
            try {
                const deletedNotifications = await tx.notification.deleteMany({
                    where: {
                        commentId: replyId,
                        type: 'reply'
                    }
                })
                console.log(`Deleted ${deletedNotifications.count} reply notifications`)
            } catch (notificationError) {
                console.log('Could not delete reply notifications:', notificationError)
            }

            // Delete the reply
            await tx.comment.delete({
                where: { id: replyId }
            })

            // Update photo comment count
            await tx.photo.update({
                where: { id: reply.photoId },
                data: {
                    commentCount: {
                        decrement: 1
                    }
                }
            })
        })

        return NextResponse.json({
            success: true,
            message: 'Reply and related notifications deleted successfully',
            notificationsDeleted: true
        })

    } catch (error) {
        console.error('Error deleting reply:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete reply' },
            { status: 500 }
        )
    }
}