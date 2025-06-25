import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"
import { deleteNotificationsByAction } from '../../../utils/notificationCleanup'


export async function POST(request: NextRequest) {
    try {
        console.log('POST /api/reply - Starting request')
        
        const { userId } = await auth()
        console.log('User ID:', userId)
        
        if (!userId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const body = await request.json()
        console.log('Request body:', body)
        
        const { commentId, text } = body

        if (!commentId || !text) {
            return NextResponse.json(
                { success: false, error: 'Comment ID and text are required' },
                { status: 400 }
            )
        }

        console.log('Finding parent comment:', commentId)

        // Get parent comment and photo info
        const parentComment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                photo: {
                    select: {
                        id: true,
                        userId: true,
                        title: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                }
            }
        })

        if (!parentComment) {
            console.log('Parent comment not found:', commentId)
            return NextResponse.json(
                { success: false, error: 'Parent comment not found' },
                { status: 404 }
            )
        }

        console.log('Parent comment found, getting current user')

        // Get current user info with error handling
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                email: true
            }
        })

        if (!currentUser) {
            console.log('Current user not found in database:', userId)
            
            // Try to create user if not exists (for Clerk integration)
            try {
                const newUser = await prisma.user.create({
                    data: {
                        id: userId,
                        name: 'User',
                        username: `user_${userId.slice(-8)}`,
                        email: `${userId}@example.com`
                    },
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true
                    }
                })
                console.log('Created new user:', newUser)
            } catch (createError) {
                console.error('Failed to create user:', createError)
                return NextResponse.json(
                    { success: false, error: 'User not found and could not be created' },
                    { status: 404 }
                )
            }
        }

        console.log('Creating reply in transaction')

        // Create reply and update counts in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create the reply
            const newReply = await tx.comment.create({
                data: {
                    content: text.trim(),
                    photoId: parentComment.photoId,
                    userId,
                    parentId: commentId
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

            console.log('Reply created:', newReply.id)

            // Update photo comment count
            await tx.photo.update({
                where: { id: parentComment.photoId },
                data: {
                    commentCount: {
                        increment: 1
                    }
                }
            })

            console.log('Photo comment count updated')

            // Create notification for the comment owner (not photo owner)
            if (parentComment.userId !== userId) {
                try {
                    await tx.notification.create({
                        data: {
                            userId: parentComment.userId, // Comment owner receives notification
                            actionUserId: userId,
                            type: 'reply',
                            title: 'New Reply',
                            message: `${newReply.user.name || newReply.user.username} replied to your comment`,
                            photoId: parentComment.photoId,
                            commentId: newReply.id,
                            isRead: false
                        }
                    })
                    console.log('Reply notification created')
                } catch (notificationError) {
                    console.log('Could not create reply notification (table may not exist):', notificationError)
                }
            }

            return newReply
        })

        console.log('Transaction completed successfully')

        // Ensure user data is properly structured
        const replyUser = result.user || currentUser || {
            id: userId,
            name: 'Unknown User',
            username: 'unknown',
            avatar: null
        }

        // Transform the reply to match your interface exactly
        const transformedReply = {
            id: result.id,
            content: result.content,
            text: result.content, // Include both for compatibility
            createdAt: result.createdAt.toISOString(),
            user: {
                id: replyUser.id,
                name: replyUser.name || replyUser.username || 'Unknown User',
                username: replyUser.username || replyUser.name || 'unknown',
                avatar: replyUser.avatar || null
            }
        }

        console.log('Transformed reply being sent:', transformedReply)

        return NextResponse.json({
            success: true,
            reply: transformedReply,
            message: 'Reply added successfully'
        })

    } catch (error) {
        console.error('Error creating reply:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to create reply: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        )
    }
}

export async function DELETE(request: NextRequest) {
    try {
        console.log('DELETE /api/reply - Starting request')
        
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

        console.log('Finding reply to delete:', replyId)

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
                },
                user: {
                    select: {
                        id: true
                    }
                }
            }
        })

        if (!reply) {
            console.log('Reply not found:', replyId)
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
                { success: false, error: 'You can only delete your own replies or replies on your content' },
                { status: 403 }
            )
        }

        console.log('Deleting reply and updating counts')

        // Delete reply and update counts in a transaction
        await prisma.$transaction(async (tx) => {
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

        // Delete reply notifications using utility function
        await deleteNotificationsByAction({
            actionUserId: reply.userId,
            type: 'reply',
            commentId: replyId
        })

        console.log('Reply deleted successfully')

        return NextResponse.json({
            success: true,
            message: 'Reply deleted successfully',
            notificationsDeleted: true
        })

    } catch (error) {
        console.error('Error deleting reply:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete reply: ' + (error instanceof Error ? error.message : 'Unknown error') },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const commentId = searchParams.get('commentId')

        if (!commentId) {
            return NextResponse.json(
                { success: false, error: 'Comment ID is required' },
                { status: 400 }
            )
        }

        console.log('Fetching replies for comment:', commentId)

        // Fetch replies for the comment
        const replies = await prisma.comment.findMany({
            where: {
                parentId: commentId
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
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        console.log('Found replies:', replies.length)

        // Transform replies to match your interface
        const transformedReplies = replies.map(reply => ({
            id: reply.id,
            content: reply.content,
            text: reply.content,
            createdAt: reply.createdAt.toISOString(),
            user: {
                id: reply.user.id,
                name: reply.user.name || reply.user.username || 'Unknown User',
                username: reply.user.username || reply.user.name || 'unknown',
                avatar: reply.user.avatar || null
            }
        }))

        return NextResponse.json({
            success: true,
            replies: transformedReplies
        })

    } catch (error) {
        console.error('Error fetching replies:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch replies' },
            { status: 500 }
        )
    }
}