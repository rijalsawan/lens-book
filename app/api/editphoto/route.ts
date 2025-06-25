import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest) {
    try {
        // Get the authenticated user
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get photo ID from query parameters
        const { searchParams } = new URL(request.url);
        const photoId = searchParams.get('photoid');

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 });
        }

        // Get the request body
        const body = await request.json();
        const { title, description, location } = body;

        // Validate input
        if (title && title.length > 100) {
            return NextResponse.json({ error: 'Title must be 100 characters or less' }, { status: 400 });
        }

        if (description && description.length > 500) {
            return NextResponse.json({ error: 'Description must be 500 characters or less' }, { status: 400 });
        }

        if (location && location.length > 100) {
            return NextResponse.json({ error: 'Location must be 100 characters or less' }, { status: 400 });
        }

        // Check if the photo exists and belongs to the user
        const existingPhoto = await prisma.photo.findFirst({
            where: {
                id: photoId,
                userId: userId
            }
        });

        if (!existingPhoto) {
            return NextResponse.json({ 
                error: 'Photo not found or you do not have permission to edit it' 
            }, { status: 404 });
        }

        // Update the photo
        const updatedPhoto = await prisma.photo.update({
            where: {
                id: photoId,
            },
            data: {
                title: title || null,
                description: description || null,
                location: location || null,
                updatedAt: new Date()
            }
        });


        // Format the response to match frontend expectations
        const formattedPhoto = {
            id: updatedPhoto.id,
            url: updatedPhoto.url,
            title: updatedPhoto.title,
            description: updatedPhoto.description,
            location: updatedPhoto.location,
            userId: updatedPhoto.userId,
            createdAt: updatedPhoto.createdAt.toISOString(),
            updatedAt: updatedPhoto.updatedAt.toISOString(),
            likeCount: updatedPhoto.likeCount,
            commentCount: updatedPhoto.commentCount
        };
        return NextResponse.json(formattedPhoto, { status: 200 });
    }
    catch (error) {
        console.error('Error updating photo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}



