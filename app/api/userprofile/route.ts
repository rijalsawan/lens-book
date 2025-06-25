import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const userId = searchParams.get('userId')
        
        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 })
        }

        // Find user in database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                bio: true,
                location: true,
                isPrivate: true,
                createdAt: true,
                updatedAt: true
            }
        })

        if (!user) {
            // Return default values if user doesn't exist in database yet
            return NextResponse.json({
                name: '',
                username: '',
                email: '',
                bio: '',
                location: '',
                isPrivate: false
            })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { fullName, username, email, bio, location, isPrivate } = body

        console.log('Updating user profile:', { userId, fullName, username, email, bio, location, isPrivate })

        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        })

        let updatedUser

        if (existingUser) {
            // Update existing user
            updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    name: fullName || existingUser.name,
                    username: username || existingUser.username,
                    email: email || existingUser.email,
                    bio: bio !== undefined ? bio : existingUser.bio,
                    location: location !== undefined ? location : existingUser.location,
                    isPrivate: isPrivate !== undefined ? isPrivate : existingUser.isPrivate,
                    updatedAt: new Date()
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    name: true,
                    bio: true,
                    location: true,
                    isPrivate: true,
                    createdAt: true,
                    updatedAt: true
                }
            })
        } else {
            // Create new user record
            updatedUser = await prisma.user.create({
                data: {
                    id: userId,
                    username: username || `user_${userId.slice(-8)}`,
                    email: email || '',
                    name: fullName || '',
                    bio: bio || '',
                    location: location || '',
                    isPrivate: isPrivate || false
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    name: true,
                    bio: true,
                    location: true,
                    isPrivate: true,
                    createdAt: true,
                    updatedAt: true
                }
            })
        }

        return NextResponse.json({
            success: true,
            user: updatedUser
        })

    } catch (error) {
        console.error('Error updating user profile:', error)
        
        // Handle specific Prisma errors
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            return NextResponse.json({ 
                error: 'Username or email already taken. Please choose different values.' 
            }, { status: 400 })
        }

        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}