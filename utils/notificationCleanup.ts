import { PrismaClient } from '@/app/generated/prisma'

const prisma = new PrismaClient()

export async function deleteNotificationsByAction({
    actionUserId,
    type,
    photoId,
    commentId
}: {
    actionUserId: string
    type: 'like' | 'comment' | 'reply'
    photoId?: string
    commentId?: string
}) {
    try {
        const whereClause: any = {
            actionUserId,
            type
        }

        if (photoId) whereClause.photoId = photoId
        if (commentId) whereClause.commentId = commentId

        const result = await prisma.notification.deleteMany({
            where: whereClause
        })

        console.log(`Deleted ${result.count} ${type} notifications for user ${actionUserId}`)
        return result
    } catch (error) {
        console.error('Error deleting notifications:', error)
        return null
    } finally {
        await prisma.$disconnect()
    }
}

export async function cleanupOrphanedNotifications() {
    try {
        // Delete notifications for deleted photos
        const orphanedPhotoNotifications = await prisma.notification.deleteMany({
            where: {
                photoId: {
                    not: null
                },
                photo: null
            }
        })

        // Delete notifications for deleted comments
        const orphanedCommentNotifications = await prisma.notification.deleteMany({
            where: {
                commentId: {
                    not: null
                },
                comment: null
            }
        })

        console.log(`Cleaned up ${orphanedPhotoNotifications.count} orphaned photo notifications`)
        console.log(`Cleaned up ${orphanedCommentNotifications.count} orphaned comment notifications`)

        return {
            photoNotifications: orphanedPhotoNotifications.count,
            commentNotifications: orphanedCommentNotifications.count
        }
    } catch (error) {
        console.error('Error cleaning up orphaned notifications:', error)
        return null
    } finally {
        await prisma.$disconnect()
    }
}

// ... rest of your existing notification functions