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

    // Get followers with their follow status relative to current user
    const followers = await prisma.follow.findMany({
      where: {
        followingId: userId
      },
      include: {
        follower: {
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

    const totalFollowers = await prisma.follow.count({
      where: {
        followingId: userId
      }
    })

    const formattedFollowers = followers.map(follow => ({
      id: follow.follower.id,
      name: follow.follower.name,
      username: follow.follower.username,
      avatar: follow.follower.avatar,
      bio: follow.follower.bio,
      isFollowing: currentUserId ? follow.follower.followers.length > 0 : false,
      followedAt: follow.createdAt
    }))

    return NextResponse.json({
      followers: formattedFollowers,
      total: totalFollowers,
      hasMore: skip + limit < totalFollowers,
      page,
      limit
    })

  } catch (error) {
    console.error('Error fetching followers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    )
  }
}