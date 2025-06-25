import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from "@/lib/prisma"


export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '10')
        const skip = (page - 1) * limit

        const { userId: currentUserId } = await auth()

        console.log('Fetching feed - Page:', page, 'Limit:', limit, 'User:', currentUserId)

        // Get photos with all related data
        const photos = await prisma.photo.findMany({
            skip,
            take: limit + 1, // Get one extra to check if there are more
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                // User who posted the photo
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                        bio: true,
                        createdAt: true
                    }
                },
                // Likes with user info
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                // Comments with user info and replies
                comments: {
                    where: {
                        parentId: null // Only get top-level comments
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        },
                        // Replies to comments
                        replies: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        avatar: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        },
                        _count: {
                            select: {
                                replies: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                // Shares (if you have this feature)
                shares: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                // Count aggregations for performance
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true
                    }
                }
            }
        })

        const hasMore = photos.length > limit
        const photosToReturn = photos.slice(0, limit)

        console.log(`Found ${photosToReturn.length} photos`)

        // Transform the data to a cleaner format
        const transformedPhotos = photosToReturn.map(photo => ({
            id: photo.id,
            url: photo.url,
            title: photo.title,
            description: photo.description,
            location: photo.location,
            tags: photo.tags || [],
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
            
            // User who posted
            user: {
                id: photo.user.id,
                name: photo.user.name || '',
                username: photo.user.username || '',
                avatar: photo.user.avatar || null,
                bio: photo.user.bio || null,
                joinedAt: photo.user.createdAt.toISOString()
            },
            
            // Statistics
            stats: {
                likes: photo._count.likes,
                comments: photo._count.comments,
                shares: photo._count.shares,
                views: 0 // You can implement view tracking later
            },
            
            // Current user's interaction status
            interactions: {
                isLiked: currentUserId ? photo.likes.some(like => like.userId === currentUserId) : false,
                isSaved: false, // You can implement saved posts later
                isShared: currentUserId ? photo.shares.some(share => share.userId === currentUserId) : false
            },
            
            // Likes with user info (limited to recent ones for performance)
            likes: photo.likes.slice(0, 20).map(like => ({
                id: like.id,
                createdAt: like.createdAt.toISOString(),
                user: {
                    id: like.user.id,
                    name: like.user.name || '',
                    username: like.user.username || '',
                    avatar: like.user.avatar || null
                }
            })),
            
            // Comments with replies
            comments: photo.comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                user: {
                    id: comment.user.id,
                    name: comment.user.name || '',
                    username: comment.user.username || '',
                    avatar: comment.user.avatar || null
                },
                replyCount: comment._count.replies,
                replies: comment.replies.map(reply => ({
                    id: reply.id,
                    content: reply.content,
                    createdAt: reply.createdAt.toISOString(),
                    user: {
                        id: reply.user.id,
                        name: reply.user.name || '',
                        username: reply.user.username || '',
                        avatar: reply.user.avatar || null
                    }
                }))
            })),
            
            // Shares (if needed)
            shares: photo.shares.slice(0, 10).map(share => ({
                id: share.id,
                createdAt: share.createdAt.toISOString(),
                user: {
                    id: share.user.id,
                    name: share.user.name || '',
                    username: share.user.username || '',
                    avatar: share.user.avatar || null
                }
            }))
        }))

        return NextResponse.json({
            success: true,
            photos: transformedPhotos,
            pagination: {
                page,
                limit,
                hasMore,
                total: transformedPhotos.length
            },
            meta: {
                timestamp: new Date().toISOString(),
                currentUserId: currentUserId || null
            }
        })

    } catch (error) {
        console.error('Error fetching feed:', error)
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch feed',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
            }, 
            { status: 500 }
        )
    }
}

// Optional: GET specific photo with all details
export async function POST(request: NextRequest) {
    try {
        const { photoId } = await request.json()
        const { userId: currentUserId } = await auth()

        if (!photoId) {
            return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })
        }

        const photo = await prisma.photo.findUnique({
            where: { id: photoId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        avatar: true,
                        bio: true,
                        createdAt: true
                    }
                },
                likes: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                comments: {
                    where: {
                        parentId: null
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                avatar: true
                            }
                        },
                        replies: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        avatar: true
                                    }
                                }
                            },
                            orderBy: {
                                createdAt: 'asc'
                            }
                        },
                        _count: {
                            select: {
                                replies: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        likes: true,
                        comments: true,
                        shares: true
                    }
                }
            }
        })

        if (!photo) {
            return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
        }

        

        // Transform single photo data (similar to above)
        const transformedPhoto = {
            id: photo.id,
            url: photo.url,
            title: photo.title,
            description: photo.description,
            tags: photo.tags || [],
            createdAt: photo.createdAt.toISOString(),
            updatedAt: photo.updatedAt.toISOString(),
            
            user: {
                id: photo.user.id,
                name: photo.user.name || '',
                username: photo.user.username || '',
                avatar: photo.user.avatar || null,
                bio: photo.user.bio || null,
                joinedAt: photo.user.createdAt.toISOString()
            },
            
            stats: {
                likes: photo._count.likes,
                comments: photo._count.comments,
                shares: photo._count.shares
            },
            
            interactions: {
                isLiked: currentUserId ? photo.likes.some(like => like.userId === currentUserId) : false,
                isSaved: false,
                isShared: false
            },
            
            likes: photo.likes.map(like => ({
                id: like.id,
                createdAt: like.createdAt.toISOString(),
                user: {
                    id: like.user.id,
                    name: like.user.name || '',
                    username: like.user.username || '',
                    avatar: like.user.avatar || null
                }
            })),
            
            comments: photo.comments.map(comment => ({
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt.toISOString(),
                user: {
                    id: comment.user.id,
                    name: comment.user.name || '',
                    username: comment.user.username || '',
                    avatar: comment.user.avatar || null
                },
                replyCount: comment._count.replies,
                replies: comment.replies.map(reply => ({
                    id: reply.id,
                    content: reply.content,
                    createdAt: reply.createdAt.toISOString(),
                    user: {
                        id: reply.user.id,
                        name: reply.user.name || '',
                        username: reply.user.username || '',
                        avatar: reply.user.avatar || null
                    }
                }))
            }))
        }

        return NextResponse.json({
            success: true,
            photo: transformedPhoto
        })

    } catch (error) {
        console.error('Error fetching photo details:', error)
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch photo details',
                details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
            }, 
        )
    }
}
