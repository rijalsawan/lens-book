'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, 
    Heart, 
    MessageCircle, 
    Send, 
    Bookmark, 
    MoreHorizontal,
    Trash2,
    Smile
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

interface Photo {
    id: string
    url: string
    title?: string
    description?: string
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

interface CommentsModalProps {
    photo: Photo
    isOpen: boolean
    onClose: () => void
    onLike: (photo: Photo) => void
    comments: Comment[]
    onAddComment: (photoId: string, text: string) => void
    onAddReply: (commentId: string, text: string) => void
    onDeleteComment: (commentId: string) => void
    onDeleteReply?: (replyId: string, commentId: string) => void
    canDeleteComment: (comment: Comment, photoOwnerId?: string) => boolean
    canDeleteReply?: (reply: Reply, commentOwnerId?: string, photoOwnerId?: string) => boolean
    loading?: boolean
}

export default function CommentsModal({
    photo,
    isOpen,
    onClose,
    onLike,
    comments,
    onAddComment,
    onAddReply,
    onDeleteComment,
    onDeleteReply,
    canDeleteComment,
    canDeleteReply,
    loading = false
}: CommentsModalProps) {
    const { user: clerkUser } = useUser()
    const [newComment, setNewComment] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [showReplies, setShowReplies] = useState<{[key: string]: boolean}>({})
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
    const [showDeleteReplyConfirm, setShowDeleteReplyConfirm] = useState<string | null>(null)
    const [showMobileMenu, setShowMobileMenu] = useState<{[key: string]: boolean}>({})
    const [showReplyMobileMenu, setShowReplyMobileMenu] = useState<{[key: string]: boolean}>({})
    
    const commentsEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen && inputRef.current) {
            // Focus input when modal opens
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    // Auto-expand replies when comments change (new reply added)
    useEffect(() => {
        comments.forEach(comment => {
            if (comment.replies && comment.replies.length > 0 && !showReplies[comment.id]) {
                const hasNewReplies = comment.replies.length > 0
                if (hasNewReplies) {
                    setShowReplies(prev => ({ ...prev, [comment.id]: true }))
                }
            }
        })
    }, [comments])

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

    const getCommentText = (comment: Comment) => {
        return comment.content || comment.text || ''
    }

    const getReplyText = (reply: Reply) => {
        return reply.content || reply.text || ''
    }

    const UserAvatar = ({ user, size = 'md' }: { user: any, size?: 'sm' | 'md' | 'lg' }) => {
        const sizeClasses = {
            sm: 'w-6 h-6',
            md: 'w-8 h-8',
            lg: 'w-10 h-10'
        }

        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {user?.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className={`font-bold text-slate-600 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    const handleAddComment = () => {
        if (!newComment.trim()) return
        onAddComment(photo.id, newComment)
        setNewComment('')
    }

    const handleAddReply = async (commentId: string) => {
        if (!replyText.trim()) return
        
        // Show replies for this comment immediately
        setShowReplies(prev => ({ ...prev, [commentId]: true }))
        
        // Add the reply
        await onAddReply(commentId, replyText)
        
        // Clear reply state
        setReplyText('')
        setReplyingTo(null)
    }

    const handleDeleteReply = (replyId: string, commentId: string) => {
        if (onDeleteReply) {
            onDeleteReply(replyId, commentId)
        }
        setShowDeleteReplyConfirm(null)
        setShowReplyMobileMenu({})
    }

    const startReply = (commentId: string) => {
        setReplyingTo(commentId)
        setReplyText('')
        // Also show replies when starting to reply
        setShowReplies(prev => ({ ...prev, [commentId]: true }))
    }

    const cancelReply = () => {
        setReplyingTo(null)
        setReplyText('')
    }

    const toggleReplies = (commentId: string) => {
        setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }))
    }

    // Close all menus when clicking outside
    const closeAllMenus = () => {
        setShowMobileMenu({})
        setShowReplyMobileMenu({})
        setShowDeleteConfirm(null)
        setShowDeleteReplyConfirm(null)
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                onClick={(e) => {
                    closeAllMenus()
                    onClose()
                }}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
                >
                    
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <div className="flex items-start gap-3">
                            <UserAvatar user={photo.user} size="md" />
                            <div>
                                <span className="font-semibold text-slate-900">{photo.user.username}</span>
                                <span className="text-slate-700 ml-2">
                                    {photo.title && <span className="font-medium">{photo.title}</span>}
                                    {photo.title && photo.description && ' - '}
                                    {photo.description}
                                </span>
                                <p className="text-xs text-slate-500 mt-1">{formatTimeAgo(photo.createdAt)}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>

                    {/* Comments List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-500 font-medium">No comments yet</p>
                                <p className="text-slate-400 text-sm">Be the first to comment!</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="space-y-2">
                                    {/* Main Comment */}
                                    <div className="flex items-start gap-3 group">
                                        <UserAvatar user={comment.user} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <div>
                                                <span className="font-semibold text-slate-900 text-sm">
                                                    {comment.user.username}
                                                </span>
                                                <span className="text-slate-700 ml-2 text-sm">
                                                    {getCommentText(comment)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-xs text-slate-500">
                                                    {formatTimeAgo(comment.createdAt)}
                                                </span>
                                                <button
                                                    onClick={() => startReply(comment.id)}
                                                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                                >
                                                    Reply
                                                </button>
                                                {comment.replyCount > 0 && (
                                                    <button
                                                        onClick={() => toggleReplies(comment.id)}
                                                        className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                                                    >
                                                        {showReplies[comment.id] ? 'Hide' : 'View'} replies ({comment.replyCount})
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Comment Delete Options */}
                                        {canDeleteComment(comment, photo.user.id) && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => {
                                                        closeAllMenus()
                                                        setShowMobileMenu(prev => ({ 
                                                            ...prev, 
                                                            [comment.id]: !prev[comment.id] 
                                                        }))
                                                    }}
                                                    className="p-1 lg:opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-full transition-all"
                                                >
                                                    <MoreHorizontal className="w-4 h-4 text-slate-500" />
                                                </button>
                                                
                                                {/* Comment Dropdown Menu */}
                                                {showMobileMenu[comment.id] && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-20 min-w-[120px]"
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                setShowDeleteConfirm(comment.id)
                                                                setShowMobileMenu({})
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Comment Delete Confirmation */}
                                    {showDeleteConfirm === comment.id && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="ml-9 bg-red-50 border border-red-200 rounded-lg p-3"
                                        >
                                            <p className="text-sm text-red-800 mb-3">Delete this comment?</p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        onDeleteComment(comment.id)
                                                        setShowDeleteConfirm(null)
                                                    }}
                                                    disabled={loading}
                                                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? 'Deleting...' : 'Delete'}
                                                </button>
                                                <button
                                                    onClick={() => setShowDeleteConfirm(null)}
                                                    className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Replies */}
                                    <AnimatePresence>
                                        {showReplies[comment.id] && comment.replies && comment.replies.length > 0 && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="ml-9 space-y-2 border-l-2 border-slate-100 pl-3"
                                            >
                                                {comment.replies.map((reply) => (
                                                    <div key={reply.id} className="flex items-start gap-3 group relative">
                                                        <UserAvatar user={reply.user} size="sm" />
                                                        <div className="flex-1 min-w-0">
                                                            <div>
                                                                <span className="font-semibold text-slate-900 text-sm">
                                                                    {reply.user.username}
                                                                </span>
                                                                <span className="text-slate-700 ml-2 text-sm">
                                                                    {getReplyText(reply)}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-slate-500">
                                                                {formatTimeAgo(reply.createdAt)}
                                                            </span>
                                                        </div>

                                                        {/* Reply Delete Options */}
                                                        {canDeleteReply && canDeleteReply(reply, comment.user.id, photo.user.id) && (
                                                            <div className="relative">
                                                                <button
                                                                    onClick={() => {
                                                                        closeAllMenus()
                                                                        setShowReplyMobileMenu(prev => ({ 
                                                                            ...prev, 
                                                                            [reply.id]: !prev[reply.id] 
                                                                        }))
                                                                    }}
                                                                    className="p-1 lg:opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-full transition-all"
                                                                >
                                                                    <MoreHorizontal className="w-3 h-3 text-slate-500" />
                                                                </button>
                                                                
                                                                {/* Reply Dropdown Menu */}
                                                                {showReplyMobileMenu[reply.id] && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                        className="absolute right-0 top-6 bg-white border border-slate-200 rounded-lg shadow-lg p-1 z-30 min-w-[120px]"
                                                                    >
                                                                        <button
                                                                            onClick={() => {
                                                                                setShowDeleteReplyConfirm(reply.id)
                                                                                setShowReplyMobileMenu({})
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded flex items-center gap-2"
                                                                        >
                                                                            <Trash2 className="w-3 h-3" />
                                                                            Delete
                                                                        </button>
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Reply Input */}
                                    {replyingTo === comment.id && clerkUser && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="ml-9 flex items-center gap-2 border-l-2 border-purple-200 pl-3"
                                        >
                                            <UserAvatar user={{
                                                name: clerkUser.fullName || 'User',
                                                avatar: clerkUser.imageUrl
                                            }} size="sm" />
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    type="text"
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder={`Reply to ${comment.user.username}...`}
                                                    className="flex-1 text-sm border border-slate-200 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleAddReply(comment.id)
                                                        }
                                                        if (e.key === 'Escape') {
                                                            cancelReply()
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={cancelReply}
                                                    className="text-slate-400 hover:text-slate-600 text-sm"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                {replyText.trim() && (
                                                    <button
                                                        onClick={() => handleAddReply(comment.id)}
                                                        disabled={loading}
                                                        className="text-purple-600 hover:text-purple-700 font-semibold text-sm px-2 disabled:opacity-50"
                                                    >
                                                        Post
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    {/* Actions Bar */}
                    <div className="border-t border-slate-200 p-4 space-y-3">
                        {/* Like, Comment, Share */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => onLike(photo)}
                                    className="flex items-center gap-2"
                                >
                                    <Heart 
                                        className={`w-6 h-6 transition-all duration-200 ${
                                            photo.isLiked 
                                                ? 'fill-red-500 text-red-500' 
                                                : 'text-slate-600 hover:text-red-500'
                                        }`} 
                                    />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => inputRef.current?.focus()}
                                >
                                    <MessageCircle className="w-6 h-6 text-slate-600 hover:text-purple-500 transition-colors" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <Send className="w-6 h-6 text-slate-600 hover:text-green-500 transition-colors" />
                                </motion.button>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Bookmark className="w-6 h-6 text-slate-600 hover:text-yellow-500 transition-colors" />
                            </motion.button>
                        </div>

                        {/* Like count */}
                        <p className="font-semibold text-slate-900 text-sm">
                            {photo.likeCount.toLocaleString()} {photo.likeCount === 1 ? 'like' : 'likes'}
                        </p>

                        {/* Add Comment */}
                        {clerkUser && (
                            <div className="flex items-center gap-3">
                                <UserAvatar user={{
                                    name: clerkUser.fullName || 'User',
                                    avatar: clerkUser.imageUrl
                                }} size="sm" />
                                <div className="flex-1 flex items-center gap-2 border border-slate-200 rounded-full pl-4 pr-2 py-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="flex-1 text-sm outline-none placeholder-slate-500 bg-transparent"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleAddComment()
                                            }
                                        }}
                                    />
                                    <button className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                        <Smile className="w-4 h-4 text-slate-400" />
                                    </button>
                                    {newComment.trim() && (
                                        <button
                                            onClick={handleAddComment}
                                            disabled={loading}
                                            className="text-purple-600 hover:text-purple-700 font-semibold text-sm px-2 disabled:opacity-50"
                                        >
                                            Post
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Reply Delete Confirmation Modal */}
                <AnimatePresence>
                    {showDeleteReplyConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4"
                            onClick={() => setShowDeleteReplyConfirm(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-white border border-red-200 rounded-lg p-4 max-w-sm w-full shadow-xl"
                            >
                                <p className="text-sm text-red-800 mb-4 font-medium">Delete this reply?</p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowDeleteReplyConfirm(null)}
                                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            const replyId = showDeleteReplyConfirm
                                            // Find the comment that contains this reply
                                            const parentComment = comments.find(comment => 
                                                comment.replies.some(reply => reply.id === replyId)
                                            )
                                            if (parentComment && replyId) {
                                                handleDeleteReply(replyId, parentComment.id)
                                            }
                                        }}
                                        disabled={loading}
                                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    )
}
