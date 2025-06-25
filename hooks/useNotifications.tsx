import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, UserPlus, Bell } from 'lucide-react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data: {
    actionUserId?: string
    actionUserName?: string
    actionUserAvatar?: string
    photoId?: string
    photoUrl?: string
    photoTitle?: string
    commentId?: string
    commentContent?: string
  }
}

export function useNotifications() {
  const { user } = useUser()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isConnected, setIsConnected] = useState(false)

  // Use refs to avoid stale closures and prevent unnecessary re-renders
  const notificationsRef = useRef(notifications)
  const unreadCountRef = useRef(unreadCount)
  const loadingRef = useRef(loading)
  const userIdRef = useRef(user?.id)
  const lastFetchTime = useRef(0)
  
  useEffect(() => { 
    notificationsRef.current = notifications 
  }, [notifications])
  
  useEffect(() => { 
    unreadCountRef.current = unreadCount 
  }, [unreadCount])

  useEffect(() => { 
    loadingRef.current = loading 
  }, [loading])

  useEffect(() => { 
    userIdRef.current = user?.id 
  }, [user?.id])

  // Socket event handlers with throttling
  const handleNewNotification = useCallback((notification: Notification) => {
    console.log('📢 New notification received:', notification)
    
    // Add to notifications list if not already present
    setNotifications(prev => {
      const exists = prev.some(n => n.id === notification.id)
      if (exists) return prev
      return [notification, ...prev]
    })
    setUnreadCount(prev => prev + 1)
    
    // Show toast notification
    showNotificationToast(notification)
  }, [])

  const handleNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const handleAllNotificationsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    )
    setUnreadCount(0)
  }, [])

  // Beautiful toast notification component
  const showNotificationToast = (notification: Notification) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'like':
          return <Heart className="w-5 h-5 text-red-500 fill-red-500" />
        case 'comment':
        case 'reply':
          return <MessageCircle className="w-5 h-5 text-blue-500" />
        case 'follow':
          return <UserPlus className="w-5 h-5 text-green-500" />
        default:
          return <Bell className="w-5 h-5 text-gray-500" />
      }
    }

    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ 
          opacity: t.visible ? 1 : 0,
          y: t.visible ? 0 : -50,
          scale: t.visible ? 1 : 0.95
        }}
        className="max-w-md w-full bg-white shadow-lg rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden"
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.data.actionUserAvatar ? (
                <img
                  className="h-10 w-10 rounded-full object-cover"
                  src={notification.data.actionUserAvatar}
                  alt=""
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {notification.data.actionUserName?.[0] || '?'}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getIcon()}
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                {notification.message}
              </p>
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
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
          >
            ✕
          </button>
        </div>
      </motion.div>
    ), {
      duration: 5000,
      position: 'top-right',
    })
  }

  // SSE connection management for real-time notifications
  useEffect(() => {
    if (!user?.id) return

    let eventSource: EventSource | null = null
    let isCleanedUp = false
    let reconnectTimeout: NodeJS.Timeout | null = null

    const setupSSE = () => {
      if (isCleanedUp) return

      try {
        console.log('Setting up SSE connection...')
        eventSource = new EventSource('/api/notifications/stream')
        
        eventSource.onopen = () => {
          if (!isCleanedUp) {
            console.log('SSE connection opened')
            setIsConnected(true)
          }
        }

        eventSource.onmessage = (event) => {
          if (isCleanedUp) return
          
          try {
            const data = JSON.parse(event.data)
            console.log('SSE message received:', data)

            switch (data.type) {
              case 'connected':
                console.log('SSE connection confirmed')
                break
                
              case 'new-notification':
                if (data.notification) {
                  handleNewNotification(data.notification)
                }
                break
                
              case 'unread-count':
                setUnreadCount(data.count)
                break
                
              case 'heartbeat':
                // Keep connection alive
                break
                
              case 'error':
                console.error('SSE error message:', data.message)
                break
            }
          } catch (error) {
            console.error('Error parsing SSE message:', error)
          }
        }

        eventSource.onerror = (error) => {
          if (!isCleanedUp) {
            console.log('SSE connection error, attempting to reconnect...')
            setIsConnected(false)
            
            if (eventSource) {
              eventSource.close()
              eventSource = null
            }
            
            // Reconnect after 3 seconds
            reconnectTimeout = setTimeout(() => {
              if (!isCleanedUp) {
                setupSSE()
              }
            }, 3000)
          }
        }

      } catch (error) {
        console.error('Error setting up SSE:', error)
        if (!isCleanedUp) {
          reconnectTimeout = setTimeout(() => {
            if (!isCleanedUp) {
              setupSSE()
            }
          }, 5000)
        }
      }
    }

    setupSSE()

    return () => {
      isCleanedUp = true
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      
      if (eventSource) {
        console.log('Closing SSE connection')
        eventSource.close()
        eventSource = null
      }
      
      setIsConnected(false)
    }
  }, [user?.id, handleNewNotification])

  // Fetch notifications from API with debouncing and rate limiting
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    const now = Date.now()
    // Rate limiting: prevent calls more frequent than 1 second
    if (now - lastFetchTime.current < 1000) {
      console.log('Rate limiting: skipping fetch')
      return
    }

    if (!userIdRef.current || loadingRef.current) return

    try {
      setLoading(true)
      lastFetchTime.current = now
      
      const response = await fetch(`/api/notification?page=${pageNum}&limit=20`)
      const data = await response.json()

      if (data.success) {
        if (reset || pageNum === 1) {
          setNotifications(data.notifications)
        } else {
          setNotifications(prev => [...prev, ...data.notifications])
        }
        setUnreadCount(data.unreadCount)
        setHasMore(data.pagination.hasMore)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, []) // Remove dependencies that cause unnecessary re-renders

  // Mark single notification as read with debouncing
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userIdRef.current) return
    
    try {
      const response = await fetch('/api/marksingleread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        // Update local state immediately for better UX
        handleNotificationRead(notificationId)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [handleNotificationRead])

  // Mark all notifications as read with debouncing
  const markAllAsRead = useCallback(async () => {
    if (!userIdRef.current) return
    
    try {
      const response = await fetch('/api/markallread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Update local state immediately for better UX
        handleAllNotificationsRead()
        toast.success('All notifications marked as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }, [handleAllNotificationsRead])

  // Initial fetch with proper dependency management
  useEffect(() => {
    if (user?.id && !loadingRef.current) {
      // Use a stable reference to avoid dependency issues
      const fetchInitial = async () => {
        const now = Date.now()
        if (now - lastFetchTime.current < 1000) return

        try {
          setLoading(true)
          lastFetchTime.current = now
          
          const response = await fetch(`/api/notification?page=1&limit=20`)
          const data = await response.json()

          if (data.success) {
            setNotifications(data.notifications)
            setUnreadCount(data.unreadCount)
            setHasMore(data.pagination.hasMore)
            setPage(1)
          }
        } catch (error) {
          console.error('Error fetching initial notifications:', error)
        } finally {
          setLoading(false)
        }
      }
      
      fetchInitial()
    }
  }, [user?.id])

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    isConnected,
    fetchNotifications: () => {
      // Prevent rapid consecutive calls
      const now = Date.now()
      if (now - lastFetchTime.current < 1000) return
      fetchNotifications(page + 1)
    },
    markAsRead,
    markAllAsRead,
    refetch: () => {
      // Debounced refetch
      const now = Date.now()
      if (now - lastFetchTime.current < 1000) return
      fetchNotifications(1, true)
    }
  }
}