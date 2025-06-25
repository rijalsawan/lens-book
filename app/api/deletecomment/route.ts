import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"
import { deleteNotificationsByAction } from '../../../utils/notificationCleanup'


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
        const { commentId } = body

        if (!commentId) {
            return NextResponse.json(
                { success: false, error: 'Comment ID is required' },
                { status: 400 }
            )
        }

        // Get comment details before deletion
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: {
                photo: {
                    select: {
                        id: true,
                        userId: true
                    }
                },
                user: {
                    select: {
                        id: true
                    }
                },
                replies: {
                    select: {
                        id: true,
                        userId: true
                    }
                }
            }
        })

        if (!comment) {
            return NextResponse.json(
                { success: false, error: 'Comment not found' },
                { status: 404 }
            )
        }

        // Check if user can delete this comment
        const canDelete = comment.userId === userId || comment.photo.userId === userId
        
        if (!canDelete) {
            return NextResponse.json(
                { success: false, error: 'You can only delete your own comments or comments on your photos' },
                { status: 403 }
            )
        }

        const totalDeleted = 1 + comment.replies.length // Main comment + replies

        // Delete comment and related data in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete all replies to this comment first (cascade)
            await tx.comment.deleteMany({
                where: {
                    parentId: commentId
                }
            })

            // Delete the main comment
            await tx.comment.delete({
                where: { id: commentId }
            })

            // Update photo comment count
            await tx.photo.update({
                where: { id: comment.photoId },
                data: {
                    commentCount: {
                        decrement: totalDeleted
                    }
                }
            })
        })

        // Delete notifications using utility function
        await deleteNotificationsByAction({
            actionUserId: comment.userId,
            type: 'comment',
            photoId: comment.photoId,
            commentId: commentId
        })

        // Delete reply notifications for all replies
        for (const reply of comment.replies) {
            await deleteNotificationsByAction({
                actionUserId: reply.userId,
                type: 'reply',
                commentId: reply.id
            })
        }

        return NextResponse.json({
            success: true,
            message: 'Comment and related notifications deleted successfully',
            deletedCount: totalDeleted, // Return the actual count that was deleted
            deletedReplies: comment.replies.length,
            notificationsDeleted: true
        })

    } catch (error) {
        console.error('Error deleting comment:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete comment' },
            { status: 500 }
        )
    }
}