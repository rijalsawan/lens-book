'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Heart,
    MessageCircle,
    Send,
    Bookmark,
    MoreHorizontal,
    Camera
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import toast from 'react-hot-toast'

// Import your custom hooks
import { usePhotosState } from '@/hooks/usePhotosState'
import { usePhotoInteractions } from '@/hooks/usePhotoInteractions'
import { useModalState } from '@/hooks/useModalState'

// Import the new CommentsModal
import CommentsModal from '@/components/CommentsModal'

interface Photo {
    id: string
    url: string
    title?: string
    description?: string
    location?: string
    tags?: string[]
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    likeCount: number
    commentCount: number
    isLiked?: boolean
    userId?: string
}

interface Comment {
    id: string
    content: string
    text: string
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
    replies: Reply[]
    replyCount: number
}

interface Reply {
    id: string
    content: string
    text: string
    createdAt: string
    user: {
        id: string
        name: string
        username: string
        avatar?: string
    }
}

export default function HomePage() {
    const { user: clerkUser, isLoaded } = useUser()

    // Use custom hooks
    const {
        photos,
        updatePhotoLike,
        updatePhotoCommentCount,
        setPhotosData,
    } = usePhotosState()

    const {
        toggleLike,
        addComment,
        addReply,
        deleteComment,
        fetchComments,
        canDeleteComment,
        loading: interactionLoading
    } = usePhotoInteractions()

    // Local state
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [page, setPage] = useState(1)
    const [hasMore, setHasMore] = useState(true)

    // Comments modal state
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
    const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
    const [photoComments, setPhotoComments] = useState<Comment[]>([])

    useEffect(() => {
        if (isLoaded) {
            loadPhotos()
        }
    }, [isLoaded])

    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop >=
                document.documentElement.offsetHeight - 1000 &&
                !loadingMore &&
                hasMore
            ) {
                loadMorePhotos()
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [loadingMore, hasMore])

    const loadPhotos = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/getfeed?page=1&limit=10')
            const data = await response.json()

            if (response.ok && data.success) {
                const transformedPhotos = data.photos.map((photo: any) => ({
                    ...photo,
                    likeCount: photo.stats?.likes || 0,
                    commentCount: photo.stats?.comments || 0,
                    isLiked: Boolean(photo.interactions?.isLiked)
                }))

                setPhotosData(transformedPhotos)
                setHasMore(data.pagination?.hasMore || false)
                setPage(2)
            } else {
                toast.error('Failed to load photos')
            }
        } catch (error) {
            console.error('Error loading photos:', error)
            toast.error('Failed to load photos')
        } finally {
            setLoading(false)
        }
    }

    const loadMorePhotos = useCallback(async () => {
        if (!hasMore || loadingMore) return

        setLoadingMore(true)
        try {
            const response = await fetch(`/api/getfeed?page=${page}&limit=10`)
            const data = await response.json()

            if (response.ok && data.success) {
                const transformedPhotos = data.photos.map((photo: any) => ({
                    ...photo,
                    likeCount: photo.stats?.likes || 0,
                    commentCount: photo.stats?.comments || 0,
                    isLiked: Boolean(photo.interactions?.isLiked)
                }))

                setPhotosData([...photos, ...transformedPhotos])
                setHasMore(data.pagination?.hasMore || false)
                setPage(prev => prev + 1)
            }
        } catch (error) {
            console.error('Error loading more photos:', error)
        } finally {
            setLoadingMore(false)
        }
    }, [page, hasMore, loadingMore, photos, setPhotosData])

    const handleLike = async (photo: Photo) => {
        if (!clerkUser) {
            toast.error('Please sign in to like photos')
            return
        }

        const wasLiked = Boolean(photo.isLiked)
        updatePhotoLike(photo.id, !wasLiked)
        const result = await toggleLike(photo.id)

        if (!result || !result.success) {
            updatePhotoLike(photo.id, wasLiked)
        }
        console.log("success");
        console.log(wasLiked);
    }

    // Comments modal functions
    const openCommentsModal = async (photo: Photo) => {
        setSelectedPhoto(photo)
        setIsCommentsModalOpen(true)

        try {
            const loadedComments = await fetchComments(photo.id)
            setPhotoComments(loadedComments)
        } catch (error) {
            console.error('Error loading comments:', error)
            toast.error('Failed to load comments')
        }
    }

    const closeCommentsModal = () => {
        setIsCommentsModalOpen(false)
        setSelectedPhoto(null)
        setPhotoComments([])
    }

    const handleAddComment = async (photoId: string, text: string) => {
        if (!clerkUser) {
            toast.error('Please sign in to comment')
            return
        }

        const result = await addComment(photoId, text)

        if (result && result.success) {
            setPhotoComments(prev => [result.comment, ...prev])
            updatePhotoCommentCount(photoId, 1)
        }
    }

    const handleAddReply = async (commentId: string, text: string) => {
        if (!clerkUser) {
            toast.error('Please sign in to reply')
            return
        }

        const result = await addReply(commentId, text)

        if (result && result.success) {
            setPhotoComments(prev => prev.map(comment =>
                comment.id === commentId
                    ? {
                        ...comment,
                        replies: [...comment.replies, result.reply],
                        replyCount: comment.replyCount + 1
                    }
                    : comment
            ))
        }
    }

    const handleDeleteComment = async (commentId: string) => {
        const result = await deleteComment(commentId)

        if (result && result.success) {
            setPhotoComments(prev => prev.filter(comment => comment.id !== commentId))
            if (selectedPhoto) {
                updatePhotoCommentCount(selectedPhoto.id, -1)
            }
        }
    }

    const handleDeleteReply = async (replyId: string, commentId: string) => {
        try {
            // Use the same deleteComment function since replies are also comments in most APIs
            const result = await deleteComment(replyId)

            if (result && result.success) {
                // Remove reply from local state
                setPhotoComments(prev => prev.map(comment =>
                    comment.id === commentId
                        ? {
                            ...comment,
                            replies: comment.replies.filter(reply => reply.id !== replyId),
                            replyCount: Math.max(0, comment.replyCount - 1)
                        }
                        : comment
                ))

                // Update photo comment count (since replies count towards total comments)
                if (selectedPhoto) {
                    updatePhotoCommentCount(selectedPhoto.id, -1)
                }


            } else {
                toast.error('Failed to delete reply')
            }
        } catch (error) {
            console.error('Error deleting reply:', error)
            toast.error('Failed to delete reply')
        }
    }

    const canDeleteReply = (reply: any, commentOwnerId?: string, photoOwnerId?: string) => {
        if (!clerkUser) return false

        // User can delete their own reply, comment owner can delete replies on their comment, photo owner can delete any reply
        return reply.user.id === clerkUser.id ||
            commentOwnerId === clerkUser.id ||
            photoOwnerId === clerkUser.id
    }

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

        if (seconds < 60) return `${seconds}s`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
        return `${Math.floor(seconds / 604800)}w`
    }

    const UserAvatar = ({ user, size = 'md' }: { user: any, size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-6 h-6',
            md: 'w-8 h-8',
            lg: 'w-12 h-12'
        }

        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className={`font-bold text-slate-600 ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
                            {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Loading your feed...</p>
                </div>
            </div>
        )
    }
    
    return (
        <>
            <div className="min-h-screen bg-slate-50 pt-16 pb-20">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    {photos.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Camera className="w-10 h-10 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">No Photos Yet</h3>
                            <p className="text-slate-600 mb-6">Be the first to share a photo with the community!</p>
                            <Link href="/addphoto">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
                                >
                                    Upload Photo
                                </motion.button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {photos.map((photo, index) => (
                                <motion.div
                                    key={photo.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                                >

                                    {/* Header */}
                                    <div className="flex items-center justify-between p-4">
                                        <Link
                                            href={`/profile/${photo.user.id}`}
                                            className="flex items-center gap-3"
                                        >
                                            <UserAvatar user={photo.user} size="lg" />
                                            <div className='flex flex-col justify-center'>
                                                <p className="font-semibold text-slate-900">{photo.user.username}</p>
                                                <p className="text-sm text-slate-500">{photo.location}</p>
                                            </div>
                                        </Link>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-500">{formatTimeAgo(photo.createdAt)}</span>
                                            <button className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                                <MoreHorizontal className="w-5 h-5 text-slate-600" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Photo */}
                                    <div className="relative">
                                        <img
                                            src={photo.url}
                                            alt={photo.title || 'Photo'}
                                            className="w-full h-auto max-h-[600px] object-cover cursor-pointer"
                                            loading="lazy"
                                            onClick={() => openCommentsModal(photo)}
                                        />
                                    </div>

                                    {/* Actions */}
                                    <div className="px-4 py-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleLike(photo)}
                                                    disabled={interactionLoading}
                                                    className="flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    <Heart
                                                        className={`w-6 h-6 transition-all duration-200 ${photo.isLiked
                                                            ? 'fill-red-500 text-red-500 scale-110'
                                                            : 'text-slate-600 hover:text-red-500'
                                                            }`}
                                                    />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => openCommentsModal(photo)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <MessageCircle className="w-6 h-6 text-slate-600 hover:text-purple-500 transition-colors" />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Send className="w-6 h-6 text-slate-600 hover:text-green-500 transition-colors" />
                                                </motion.button>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="flex items-center gap-2"
                                            >
                                                <Bookmark className="w-6 h-6 text-slate-600 hover:text-yellow-500 transition-colors" />
                                            </motion.button>
                                        </div>

                                        {/* Like count */}
                                        <div className="mb-2">
                                            <p className="font-semibold text-slate-900">
                                                {(photo.likeCount || 0).toLocaleString()} {(photo.likeCount || 0) === 1 ? 'like' : 'likes'}
                                            </p>
                                        </div>

                                        {/* Caption */}
                                        {(photo.title || photo.description) && (
                                            <div className="mb-2">
                                                <span className="font-semibold text-slate-900">{photo.user.name}</span>
                                                <span className="text-slate-700 ml-2">
                                                    {photo.description}
                                                </span>
                                            </div>
                                        )}

                                        {/* View comments */}
                                        {(photo.commentCount || 0) > 0 && (
                                            <button
                                                onClick={() => openCommentsModal(photo)}
                                                className="text-slate-500 hover:text-slate-700 text-sm mb-3 transition-colors"
                                            >
                                                View all {photo.commentCount || 0} comments
                                            </button>
                                        )}

                                        {/* Quick add comment */}
                                        {clerkUser && (
                                            <div
                                                onClick={() => openCommentsModal(photo)}
                                                className="flex items-center gap-3 pt-2 border-t border-slate-100 cursor-pointer"
                                            >
                                                <UserAvatar user={{
                                                    name: clerkUser.fullName || 'User',
                                                    avatar: clerkUser.imageUrl
                                                }} />
                                                <div className="flex-1 text-sm text-slate-500 bg-slate-50 rounded-full px-4 py-2">
                                                    Add a comment...
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}

                            {/* Loading more */}
                            {loadingMore && (
                                <div className="text-center py-8">
                                    <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-slate-600">Loading more photos...</p>
                                </div>
                            )}

                            {/* End of feed */}
                            {!hasMore && photos.length > 0 && (
                                <div className="text-center py-8">
                                    <p className="text-slate-500">You've reached the end of your feed!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Comments Modal */}
            {selectedPhoto && (
                <CommentsModal
                    photo={selectedPhoto}
                    isOpen={isCommentsModalOpen}
                    onClose={closeCommentsModal}
                    onLike={handleLike}
                    comments={photoComments}
                    onAddComment={handleAddComment}
                    onAddReply={handleAddReply}
                    onDeleteComment={handleDeleteComment}
                    canDeleteComment={canDeleteComment}
                    loading={interactionLoading}
                    canDeleteReply={canDeleteReply}
                    onDeleteReply={handleDeleteReply}
                />
            )}
        </>
    )
}
