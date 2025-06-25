import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function DELETE(
    request: NextRequest
) {
    try {
        const { userId } = await auth()
        const { searchParams } = new URL(request.url)
        const photoId = searchParams.get('photoId')
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
        }

        console.log('Deleting photo:', photoId, 'for user:', userId)

        // Check if photo exists and belongs to user
        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            select: {
                id: true,
                userId: true,
                url: true
            }
        })

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
        }

        if (photo.userId !== userId) {
            return NextResponse.json({ error: 'Unauthorized to delete this photo' }, { status: 403 })
        }

        // Delete photo and all related data in a transaction
        await prisma.$transaction(async (tx) => {
            // Delete all notifications related to this photo
            await tx.notification.deleteMany({
                where: { photoId: photoId }
            })

            // Delete all comments on this photo
            await tx.comment.deleteMany({
                where: { photoId: photoId }
            })

            // Delete all likes on this photo
            await tx.like.deleteMany({
                where: { photoId: photoId }
            })

            // Finally delete the photo
            await tx.photo.delete({
                where: { id: photoId }
            })
        })

        console.log('Photo deleted successfully:', photoId)

        return NextResponse.json({
            success: true,
            message: 'Photo deleted successfully'
        })

    } catch (error) {
        console.error('Error deleting photo:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to delete photo' },
            { status: 500 }
        )
    }
}