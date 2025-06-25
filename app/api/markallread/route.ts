import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        console.log(`Marking all notifications as read for user ${userId}`)

        // Update all unread notifications for this user
        const result = await prisma.notification.updateMany({
            where: {
                userId: userId,
                isRead: false
            },
            data: {
                isRead: true,
            }
        })

        console.log(`Marked ${result.count} notifications as read`)

        return NextResponse.json({
            success: true,
            message: 'All notifications marked as read',
            count: result.count
        })

    } catch (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to mark notifications as read' },
            { status: 500 }
        )
    }
}