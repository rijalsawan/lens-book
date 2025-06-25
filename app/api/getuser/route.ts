import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('q')
        
        if (!query || query.trim().length < 2) {
            return NextResponse.json({ users: [] })
        }

        const { userId: currentUserId } = await auth()

        const searchTerm = query.trim().toLowerCase()

        // Search for users by name or username
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    {
                        name: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    },
                    {
                        username: {
                            contains: searchTerm,
                            mode: 'insensitive'
                        }
                    }
                ]
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                bio: true,
                avatar: true,
                isPrivate: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        photos: true,
                        followers: true,
                        following: true,
                        likes: true
                    }
                },
                followers: currentUserId ? {
                    where: {
                        followerId: currentUserId
                    },
                    select: {
                        id: true
                    }
                } : false
            },
            take: 20,
            orderBy: [
                {
                    name: 'asc'
                }
            ]
        })

        // Transform the data to match the expected format
        const transformedUsers = users.map(user => ({
            id: user.id,
            name: user.name || '',
            username: user.username || '',
            email: user.email || '',
            bio: user.bio,
            avatar: user.avatar || '',
            isPrivate: user.isPrivate,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            stats: {
                photos: user._count.photos,
                followers: user._count.followers,
                following: user._count.following,
                likes: user._count.likes
            },
            isFollowing: currentUserId ? user.followers.length > 0 : false
        }))

        return NextResponse.json({ users: transformedUsers })
    } catch (error) {
        console.error('Search error:', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}