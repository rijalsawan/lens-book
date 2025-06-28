'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Bell, 
    Heart, 
    MessageCircle, 
    UserPlus, 
    AtSign,
    CheckCheck,
    Filter,
    ArrowLeft,
    MoreHorizontal
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NotificationsPage() {
    const { user: clerkUser } = useUser()
    const router = useRouter()
    const [filter, setFilter] = useState<'all' | 'unread'>('all')
    const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    
    const {
        notifications,
        unreadCount,
        loading,
        hasMore,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    } = useNotifications()

    const filteredNotifications = filter === 'unread' 
        ? notifications.filter(n => !n.isRead)
        : notifications

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart className="w-4 h-4 text-red-500 fill-red-500" />
            case 'comment':
            case 'reply':
                return <MessageCircle className="w-4 h-4 text-blue-500" />
            case 'follow':
                return <UserPlus className="w-4 h-4 text-green-500" />
            case 'mention':
                return <AtSign className="w-4 h-4 text-purple-500" />
            default:
                return <Bell className="w-4 h-4 text-slate-500" />
        }
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

    const UserAvatar = ({ user, size = "md" }: { user: any, size?: "sm" | "md" | "lg" }) => {
        const sizeClasses = {
            sm: "w-8 h-8",
            md: "w-11 h-11",
            lg: "w-14 h-14"
        }
        
        return (
            <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5 flex-shrink-0`}>
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {user?.avatar ? (
                        <img 
                            src={user.avatar} 
                            alt={user.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <span className="font-semibold text-slate-700 text-sm">
                            {user?.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                    )}
                </div>
            </div>
        )
    }

    const NotificationPhoto = ({ photoUrl, photoTitle }: { photoUrl?: string, photoTitle?: string }) => {
        if (!photoUrl) return null
        
        return (
            <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                <img 
                    src={photoUrl} 
                    alt={photoTitle || 'Photo'}
                    className="w-full h-full object-cover"
                />
            </div>
        )
    }

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        
        // Navigate based on notification type
        if (notification.data.photoId) {
            router.push(`/profile`)
        }
    }

    return (
        <div className="min-h-screen bg-white pt-16 lg:pt-0">
            {/* Mobile Header */}
            <div className="sticky top-16 lg:top-0 z-[60] bg-white border-b border-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => router.back()}
                            className="lg:hidden p-2 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
                        
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={markAllAsRead}
                                className="text-blue-500 font-semibold text-sm hover:text-blue-600 transition-colors"
                            >
                                Mark all read
                            </motion.button>
                        )}
                        <button className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                            <MoreHorizontal className="w-5 h-5 text-slate-700" />
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-t border-slate-100">
                    <button
                        onClick={() => setFilter('all')}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                            filter === 'all'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors relative ${
                            filter === 'unread'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Unread
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto">
                {loading && notifications.length === 0 ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <Bell className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">
                            {filter === 'unread' ? 'All caught up' : 'No notifications yet'}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {filter === 'unread' 
                                ? 'You\'ve seen all your latest notifications.'
                                : 'When someone likes or comments on your posts, you\'ll see it here.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        <AnimatePresence>
                            {filteredNotifications.map((notification, index) => (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ 
                                        delay: index * 0.02,
                                        duration: 0.3
                                    }}
                                    className={`relative px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                                        !notification.isRead ? 'bg-blue-50/30' : ''
                                    }`}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <UserAvatar 
                                            user={{
                                                name: notification.data.actionUserName,
                                                avatar: notification.data.actionUserAvatar
                                            }} 
                                        />
                                        
                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 pr-2">
                                                    <p className="text-sm text-slate-900 leading-relaxed">
                                                        <span className="font-semibold">
                                                            {notification.data.actionUserName}
                                                        </span>
                                                        <span className="ml-1">
                                                            {notification.type === 'like' && 'liked your photo'}
                                                            {notification.type === 'comment' && 'commented on your photo'}
                                                            {notification.type === 'reply' && 'replied to your comment'}
                                                            {notification.type === 'follow' && 'started following you'}
                                                            {notification.type === 'mention' && 'mentioned you in a comment'}
                                                        </span>
                                                        {notification.data.commentContent && (
                                                            <span className="block text-slate-600 mt-1 truncate">
                                                                "{notification.data.commentContent}"
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-slate-500">
                                                            {formatTimeAgo(notification.createdAt)}
                                                        </span>
                                                        {!notification.isRead && (
                                                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Photo thumbnail or action button */}
                                                <div className="flex items-center gap-2">
                                                    {notification.type === 'follow' ? (
                                                        <button className="px-4 py-1.5 bg-blue-500 text-white text-xs font-semibold rounded-md hover:bg-blue-600 transition-colors">
                                                            Follow back
                                                        </button>
                                                    ) : notification.data.photoUrl ? (
                                                        <NotificationPhoto 
                                                            photoUrl={notification.data.photoUrl}
                                                            photoTitle={notification.data.photoTitle}
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 flex items-center justify-center">
                                                            {getNotificationIcon(notification.type)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Load More */}
                        {hasMore && (
                            <div className="p-4">
                                <button
                                    onClick={() => fetchNotifications()}
                                    disabled={loading}
                                    className="w-full py-3 text-blue-500 font-semibold text-sm hover:text-blue-600 transition-colors disabled:opacity-50"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            Loading...
                                        </div>
                                    ) : (
                                        'Load more notifications'
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Desktop Sidebar Space */}
            <div className="hidden lg:block fixed left-0 top-0 w-64 h-full bg-white border-r border-slate-100">
                {/* Your existing sidebar content can go here */}
            </div>
        </div>
    )
}