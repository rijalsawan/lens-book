import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Adjust the import path as necessary

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        // TODO: Replace with your actual database query
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                createdAt: true,
                updatedAt: true,
                name: true,
                username: true,
                email: true,
                password: false, // Exclude password for security
                bio: true,
                avatar: true,
                isPrivate: true
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}