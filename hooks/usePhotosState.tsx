'use client'
import { useState, useCallback } from 'react'

interface Photo {
    user: any
    id: string
    url: string
    title?: string
    description?: string
    location?: string
    likeCount: number
    commentCount: number
    createdAt: string
    isLiked?: boolean
    userId: string
}

interface Comment {
    id: string
    text: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    createdAt: string
    replies?: Comment[]
    replyCount?: number
}

export function usePhotosState(initialPhotos: Photo[] = []) {
    const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
    const [comments, setComments] = useState<Comment[]>([])
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

    // Update a specific photo
    const updatePhoto = useCallback((photoId: string, updates: Partial<Photo>) => {
        setPhotos(prev => prev.map(photo => 
            photo.id === photoId 
                ? { ...photo, ...updates }
                : photo
        ))
        
        // Also update selectedPhoto if it's the same photo
        if (selectedPhoto?.id === photoId) {
            setSelectedPhoto(prev => prev ? { ...prev, ...updates } : null)
        }
    }, [selectedPhoto?.id])

    // Update photo like status
    const updatePhotoLike = useCallback((photoId: string, liked: boolean) => {
        const updates = { 
            likeCount: liked ? 1 : -1,
            isLiked: liked 
        }
        
        setPhotos(prev => prev.map(photo => 
            photo.id === photoId 
                ? { 
                    ...photo, 
                    likeCount: liked ? photo.likeCount + 1 : photo.likeCount - 1,
                    isLiked: liked 
                  }
                : photo
        ))
        
        // Also update selectedPhoto if it's the same photo
        if (selectedPhoto?.id === photoId) {
            setSelectedPhoto(prev => prev ? {
                ...prev,
                likeCount: liked ? prev.likeCount + 1 : prev.likeCount - 1,
                isLiked: liked
            } : null)
        }
    }, [selectedPhoto?.id])

    // Update photo comment count
    const updatePhotoCommentCount = useCallback((photoId: string, increment: number) => {
        setPhotos(prev => prev.map(photo => 
            photo.id === photoId 
                ? { ...photo, commentCount: Math.max(0, photo.commentCount + increment) }
                : photo
        ))
        
        // Also update selectedPhoto if it's the same photo
        if (selectedPhoto?.id === photoId) {
            setSelectedPhoto(prev => prev ? {
                ...prev,
                commentCount: Math.max(0, prev.commentCount + increment)
            } : null)
        }
    }, [selectedPhoto?.id])

    // Add a new comment
    const addComment = useCallback((comment: Comment) => {
        setComments(prev => [comment, ...prev])
    }, [])

    // Add a reply to a comment
    const addReply = (commentId: string, reply: any) => {
    console.log('Adding reply to state:', { commentId, reply }) // Debug log
    
    setComments(prev => {
        const updated = prev.map(comment => {
            if (comment.id === commentId) {
                const updatedComment = { 
                    ...comment, 
                    replies: [...(comment.replies || []), reply],
                    replyCount: (comment.replyCount || 0) + 1
                }
                console.log('Updated comment with new reply:', updatedComment) // Debug log
                return updatedComment
            }
            return comment
        })
        console.log('Updated comments array:', updated) // Debug log
        return updated
    })
}

    // Remove a comment
    const removeComment = useCallback((commentId: string) => {
        setComments(prev => prev.filter(comment => comment.id !== commentId))
    }, [])

    // Set photos
    const setPhotosData = useCallback((newPhotos: Photo[]) => {
        setPhotos(newPhotos)
    }, [])

    // Set comments
    const setCommentsData = useCallback((newComments: Comment[]) => {
        setComments(newComments)
    }, [])

    // Set selected photo
    const setSelectedPhotoData = useCallback((photo: Photo | null) => {
        setSelectedPhoto(photo)
    }, [])

    return {
        photos,
        comments,
        selectedPhoto,
        updatePhoto,
        updatePhotoLike,
        updatePhotoCommentCount,
        addComment,
        addReply,
        removeComment,
        setPhotosData,
        setCommentsData,
        setSelectedPhotoData
    }
}
