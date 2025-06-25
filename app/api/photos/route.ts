import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        const { userId: currentUserId } = await auth()

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
        }

        console.log('Fetching photos for user:', userId) // Debug log

        // Get user's photos
        const photos = await prisma.photo.findMany({
            where: {
                userId: userId,
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

        console.log('Found photos:', photos.length) // Debug log

        // Transform the data to match your Photo interface
        const transformedPhotos = photos.map(photo => ({
            id: photo.id,
            url: photo.url,
            title: photo.title,
            description: photo.description,
            createdAt: photo.createdAt.toISOString(),
            isLiked: currentUserId ? photo.likes.length > 0 : false,
            userId: photo.userId,
            // Both formats for compatibility
            likeCount: photo._count.likes,
            commentCount: photo._count.comments,
            stats: {
                likes: photo._count.likes,
                comments: photo._count.comments
            }
        }))

        console.log('Transformed photos:', transformedPhotos) // Debug log

        return NextResponse.json({ 
            photos: transformedPhotos,
            success: true 
        })
    } catch (error) {
        console.error('Error fetching user photos:', error)
        return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 })
    }
}