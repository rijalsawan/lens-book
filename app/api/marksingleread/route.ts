import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { notificationId } = body

        if (!notificationId) {
            return NextResponse.json(
                { success: false, error: 'Notification ID is required' },
                { status: 400 }
            )
        }

        console.log(`Marking notification ${notificationId} as read for user ${userId}`)

        // Update the specific notification
        const result = await prisma.notification.updateMany({
            where: {
                id: notificationId,
                userId: userId, // Ensure user can only mark their own notifications
                isRead: false
            },
            data: {
                isRead: true
            }
        })

        if (result.count === 0) {
            return NextResponse.json(
                { success: false, error: 'Notification not found or already read' },
                { status: 404 }
            )
        }

        console.log(`Notification ${notificationId} marked as read`)

        return NextResponse.json({
            success: true,
            message: 'Notification marked as read'
        })

    } catch (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to mark notification as read' },
            { status: 500 }
        )
    }
}