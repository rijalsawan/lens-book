import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const skip = (page - 1) * limit

    // Get following with their follow status relative to current user
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            bio: true,
            followers: currentUserId ? {
              where: {
                followerId: currentUserId
              },
              select: {
                id: true
              }
            } : false
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    })

    const totalFollowing = await prisma.follow.count({
      where: {
        followerId: userId
      }
    })

    const formattedFollowing = following.map(follow => ({
      id: follow.following.id,
      name: follow.following.name,
      username: follow.following.username,
      avatar: follow.following.avatar,
      bio: follow.following.bio,
      isFollowing: currentUserId ? follow.following.followers.length > 0 : false,
      followedAt: follow.createdAt
    }))

    return NextResponse.json({
      following: formattedFollowing,
      total: totalFollowing,
      hasMore: skip + limit < totalFollowing,
      page,
      limit
    })

  } catch (error) {
    console.error('Error fetching following:', error)
    return NextResponse.json(
      { error: 'Failed to fetch following' },
      { status: 500 }
    )
  }
}