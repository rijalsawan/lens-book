import prisma from '@/lib/prisma'

export async function createNotification({
    userId,
    actionUserId,
    type,
    title,
    message,
    photoId,
    commentId
}: {
    userId: string
    actionUserId: string
    type: 'like' | 'comment' | 'follow' | 'reply'
    title: string
    message: string
    photoId?: string
    commentId?: string
}) {
    try {
        // Don't create notification if user is performing action on their own content
        if (userId === actionUserId) {
            return null
        }

        // Check if similar notification already exists (to avoid spam)
        const existingNotification = await prisma.notification.findFirst({
            where: {
                userId,
                actionUserId,
                type,
                photoId,
                commentId,
                createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Within last 24 hours
                }
            }
        })

        if (existingNotification) {
            // Update existing notification instead of creating new one
            return await prisma.notification.update({
                where: { id: existingNotification.id },
                data: {
                    message,
                    isRead: false,
                    updatedAt: new Date()
                }
            })
        }

        // Create new notification
        return await prisma.notification.create({
            data: {
                userId,
                actionUserId,
                type,
                title,
                message,
                photoId,
                commentId
            }
        })
    } catch (error) {
        console.error('Error creating notification:', error)
        return null
    }
}