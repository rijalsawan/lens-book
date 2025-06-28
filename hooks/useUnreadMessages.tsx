import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'

export const useUnreadMessages = () => {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/unread')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      }
    } catch (error) {
      console.error('Error fetching unread messages:', error)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchUnreadCount()

    // Poll for updates every 30 seconds (reduced frequency)
    const interval = setInterval(fetchUnreadCount, 30000)

    // Listen for messages read events to immediately update count
    const handleMessagesRead = () => {
      fetchUnreadCount()
    }

    window.addEventListener('messagesRead', handleMessagesRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('messagesRead', handleMessagesRead)
    }
  }, [user])

  return unreadCount
}
