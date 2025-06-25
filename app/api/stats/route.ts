import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { userId: currentUserId } = await auth()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get all stats in parallel
    const [photos, likes, followers, following, isFollowing] = await Promise.all([
      prisma.photo.count({
        where: { userId }
      }),
      prisma.like.count({
        where: {
          photo: {
            userId
          }
        }
      }),
      prisma.follow.count({
        where: { followingId: userId }
      }),
      prisma.follow.count({
        where: { followerId: userId }
      }),
      currentUserId && currentUserId !== userId ? prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId
          }
        }
      }) : null
    ])

    return NextResponse.json({
      photos,
      likes,
      followers,
      following,
      isFollowing: !!isFollowing
    })

  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}