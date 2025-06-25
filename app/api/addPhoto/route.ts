import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
    try {
        const { url, description, location } = await request.json();
        const { userId } = await auth()
        if (!userId) {
            return NextResponse.json(
                { error: 'User not authenticated' },
                { status: 401 }
            );
        }
        const id = userId as string;

        if (!url) {
            return NextResponse.json(
                { error: 'Photo URL is required' },
                { status: 400 }
            );
        }

        const photo = await prisma.photo.create({
            data: {
                url,
                description: description ?? null,
                location: location ?? null,
                userId: id
            },
        });

        return NextResponse.json(photo, { status: 201 });
    } catch (error) {
        console.error('Error adding photo:', error);
        return NextResponse.json(
            { error: 'Failed to add photo' },
            { status: 500 }
        );
    }
}
