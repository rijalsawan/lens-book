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

    const { followerUserId } = await request.json()

    if (!followerUserId) {
      return NextResponse.json(
        { error: 'Follower user ID is required' },
        { status: 400 }
      )
    }

    if (userId === followerUserId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself' },
        { status: 400 }
      )
    }

    // Check if the follow relationship exists (follower following current user)
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerUserId,
          followingId: userId
        }
      },
      include: {
        follower: {
          select: {
            name: true,
            username: true
          }
        }
      }
    })

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'This user is not following you' },
        { status: 400 }
      )
    }

    // Remove the follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: followerUserId,
          followingId: userId
        }
      }
    })

    const followerName = existingFollow.follower.name || existingFollow.follower.username

    return NextResponse.json({ 
      success: true, 
      message: `Removed ${followerName} from your followers`
    })

  } catch (error) {
    console.error('Error removing follower:', error)
    return NextResponse.json(
      { error: 'Failed to remove follower' },
      { status: 500 }
    )
  }
}