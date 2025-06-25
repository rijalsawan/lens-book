import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { targetUserId, action } = await request.json()

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, username: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (action === 'follow') {
      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId
          }
        }
      })

      if (existingFollow) {
        return NextResponse.json(
          { error: 'Already following this user' },
          { status: 400 }
        )
      }

      // Create follow relationship
      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetUserId
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `You are now following ${targetUser.name || targetUser.username}`,
        isFollowing: true
      })

    } else if (action === 'unfollow') {
      // Check if currently following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId
          }
        }
      })

      if (!existingFollow) {
        return NextResponse.json(
          { error: 'Not following this user' },
          { status: 400 }
        )
      }

      // Remove follow relationship
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId
          }
        }
      })

      return NextResponse.json({ 
        success: true, 
        message: `You unfollowed ${targetUser.name || targetUser.username}`,
        isFollowing: false
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "follow" or "unfollow"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error in follow/unfollow:', error)
    return NextResponse.json(
      { error: 'Failed to process follow request' },
      { status: 500 }
    )
  }
}

// Get follow status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('targetUserId')
    
    if (!userId || !targetUserId) {
      return NextResponse.json({ isFollowing: false })
    }

    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId
        }
      }
    })

    return NextResponse.json({ isFollowing: !!follow })

  } catch (error) {
    console.error('Error checking follow status:', error)
    return NextResponse.json({ isFollowing: false })
  }
}