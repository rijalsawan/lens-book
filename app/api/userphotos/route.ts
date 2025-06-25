import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function GET(request: NextRequest) {
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        const { userId: currentUserId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        // Get user's photos
        const photos = await prisma.photo.findMany({
            where: {
                userId: userId,
                // If viewing someone else's profile, don't show private photos
                ...(currentUserId !== userId && { isPrivate: false })
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                },
                likes: currentUserId ? {
                    where: {
                        userId: currentUserId
                    },
                    select: {
                        id: true
                    }
                } : false
            }
        })

        // Transform the data
        const transformedPhotos = photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            title: photo.title,
            description: photo.description,
            tags: photo.tags,
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
            stats: {
                likes: photo._count.likes,
                comments: photo._count.comments
            },
            isLiked: currentUserId ? photo.likes.length > 0 : false
        }))

        return NextResponse.json({ photos: transformedPhotos })
    } catch (error) {
        console.error('Error fetching user photos:', error)
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }
}