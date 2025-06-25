'use client'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Bell,
    Heart,
    MessageCircle,
    UserPlus,
    AtSign,
    CheckCheck,
    X,
    Wifi,
    WifiOff
} from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    
    const {
        notifications,
        unreadCount,
        loading,
        hasMore,
        isConnected,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    } = useNotifications()

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Prevent body scroll when modal is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

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
                return <Bell className="w-4 h-4 text-gray-500" />
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

    const handleNotificationClick = (notification: any) => {
        if (!notification.isRead) {
            markAsRead(notification.id)
        }
        setIsOpen(false)

        if (notification.data.photoId) {
            router.push(`/profile`)
        } 
    }

    const UserAvatar = ({ user }: { user: any }) => (
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5 flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                {user?.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <span className="font-bold text-gray-600 text-xs">
                        {user?.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                )}
            </div>
        </div>
    )

    const LoadingState = () => (
        <div className="p-8 text-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading notifications...</p>
        </div>
    )

    const EmptyState = () => (
        <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-10 h-10 text-purple-400" />
            </div>
            <h4 className="text-gray-900 font-semibold mb-2">No notifications yet</h4>
            <p className="text-gray-500 text-sm mb-4">
                We'll notify you when someone interacts with your content!
            </p>
            <div className="flex flex-col gap-2 text-xs text-gray-400">
                <div className="flex items-center justify-center gap-2">
                    <Heart className="w-3 h-3 text-red-400" />
                    <span>Photo likes</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <MessageCircle className="w-3 h-3 text-blue-400" />
                    <span>Comments & replies</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                    <UserPlus className="w-3 h-3 text-green-400" />
                    <span>New followers</span>
                </div>
            </div>
        </div>
    )

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon with Badge */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
                <Bell className="w-6 h-6" />
                
                {/* Unread Badge */}
                {unreadCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </motion.div>
                )}
            </motion.button>

            {/* Dropdown */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Desktop Dropdown */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="hidden sm:block absolute right-0 bottom-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                                    <div className="flex items-center gap-1">
                                        {isConnected ? (
                                            <Wifi className="w-4 h-4 text-green-500" />
                                        ) : (
                                            <WifiOff className="w-4 h-4 text-red-500" />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={markAllAsRead}
                                            className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="max-h-80 overflow-y-auto">
                                {loading && notifications.length === 0 ? (
                                    <LoadingState />
                                ) : notifications.length === 0 ? (
                                    <EmptyState />
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {notifications.slice(0, 10).map((notification, index) => (
                                            <motion.div
                                                key={notification.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                                                    !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                                }`}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <UserAvatar user={{
                                                        name: notification.data.actionUserName,
                                                        avatar: notification.data.actionUserAvatar
                                                    }} />

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1 pr-2">
                                                                <p className="text-sm text-gray-900">
                                                                    <span className="font-semibold">
                                                                        {notification.data.actionUserName}
                                                                    </span>
                                                                    <span className="ml-1">
                                                                        {notification.type === 'like' && 'liked your photo'}
                                                                        {notification.type === 'comment' && 'commented on your photo'}
                                                                        {notification.type === 'reply' && 'replied to your comment'}
                                                                        {notification.type === 'follow' && 'started following you'}
                                                                        {notification.type === 'mention' && 'mentioned you'}
                                                                    </span>
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {formatTimeAgo(notification.createdAt)}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-2 ml-2">
                                                                {getNotificationIcon(notification.type)}
                                                                {!notification.isRead && (
                                                                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Photo thumbnail if available */}
                                                        {notification.data.photoUrl && (
                                                            <div className="mt-2">
                                                                <img
                                                                    src={notification.data.photoUrl}
                                                                    alt="Photo"
                                                                    className="w-12 h-12 rounded-lg object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* Load More */}
                                {hasMore && notifications.length > 0 && (
                                    <div className="p-4 text-center border-t border-gray-200">
                                        <button
                                            onClick={() => fetchNotifications()}
                                            disabled={loading}
                                            className="text-purple-600 hover:text-purple-700 text-sm font-medium disabled:opacity-50"
                                        >
                                            {loading ? 'Loading...' : 'Load more'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-3 border-t border-gray-200 bg-gray-50">
                                <Link
                                    href="/notifications"
                                    className="text-purple-600 hover:text-purple-700 text-sm font-medium block text-center"
                                    onClick={() => setIsOpen(false)}
                                >
                                    View all notifications
                                </Link>
                            </div>
                        </motion.div>

                        {/* Mobile Modal */}
                        <div className="sm:hidden fixed inset-0 z-50">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/50"
                                onClick={() => setIsOpen(false)}
                            />
                            
                            {/* Modal Content */}
                            <motion.div
                                initial={{ opacity: 0, y: '100%' }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[60vh] flex flex-col"
                            >
                                {/* Mobile Header */}
                                <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-gray-900 text-lg">Notifications</h3>
                                        <div className="flex items-center gap-1">
                                            {isConnected ? (
                                                <Wifi className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <WifiOff className="w-4 h-4 text-red-500" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center gap-1 px-3 py-1.5 bg-purple-50 rounded-lg"
                                            >
                                                <CheckCheck className="w-4 h-4" />
                                                <span className="hidden xs:inline">Mark all read</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Mobile Content */}
                                <div className="flex-1 my-2 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <EmptyState />
                                    ) : (
                                        <div className="divide-y divide-gray-100">
                                            {notifications.map((notification, index) => (
                                                <motion.div
                                                    key={notification.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className={`p-4 active:bg-gray-100 cursor-pointer transition-colors ${
                                                        !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                                    }`}
                                                    onClick={() => handleNotificationClick(notification)}
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <UserAvatar user={{
                                                            name: notification.data.actionUserName,
                                                            avatar: notification.data.actionUserAvatar
                                                        }} />

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1 pr-2">
                                                                    <p className="text-sm text-gray-900">
                                                                        <span className="font-semibold">
                                                                            {notification.data.actionUserName}
                                                                        </span>
                                                                        <span className="ml-1">
                                                                            {notification.type === 'like' && 'liked your photo'}
                                                                            {notification.type === 'comment' && 'commented on your photo'}
                                                                            {notification.type === 'reply' && 'replied to your comment'}
                                                                            {notification.type === 'follow' && 'started following you'}
                                                                            {notification.type === 'mention' && 'mentioned you'}
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {formatTimeAgo(notification.createdAt)}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-2 ml-2">
                                                                    {getNotificationIcon(notification.type)}
                                                                    {!notification.isRead && (
                                                                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Photo thumbnail if available */}
                                                            {notification.data.photoUrl && (
                                                                <div className="mt-2">
                                                                    <img
                                                                        src={notification.data.photoUrl}
                                                                        alt="Photo"
                                                                        className="w-12 h-12 rounded-lg object-cover"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Mobile Load More */}
                                    {hasMore && notifications.length > 0 && (
                                        <div className="p-4 text-center border-t border-gray-200">
                                            <button
                                                onClick={() => fetchNotifications()}
                                                disabled={loading}
                                                className="w-full py-3 text-purple-600 hover:text-purple-700 text-sm font-medium disabled:opacity-50 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                                            >
                                                {loading ? 'Loading...' : 'Load more notifications'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Mobile Footer */}
                                <div className="p-4 border-t border-gray-200 bg-gray-50">
                                    <Link
                                        href="/notifications"
                                        className="block w-full py-3 text-purple-600 hover:text-purple-700 text-sm font-medium text-center bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        View all notifications
                                    </Link>
                                </div>

                                {/* Handle for mobile drag-to-close */}
                                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gray-300 rounded-full" />
                            </motion.div>
                        </div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

export default NotificationDropdown