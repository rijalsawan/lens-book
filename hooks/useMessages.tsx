import { useState, useEffect, useCallback, useRef } from 'react'

interface Message {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean
  sender: {
    id: string
    name: string
    username: string
    avatar: string
  }
  reads: { userId: string; readAt: string }[]
}

export const useMessages = (conversationId: string) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchRef = useRef<number>(0)

  const fetchMessages = useCallback(async (force = false) => {
    if (!conversationId) return

    // Prevent too frequent requests (minimum 2 seconds between calls unless forced)
    const now = Date.now()
    if (!force && now - lastFetchRef.current < 2000) return
    lastFetchRef.current = now

    try {
      setLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      setMessages(data.messages)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !conversationId) return false

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Refresh messages after sending
      await fetchMessages(true) // Force refresh
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      return false
    }
  }, [conversationId, fetchMessages])

  const editMessage = useCallback(async (messageId: string, content: string) => {
    if (!content.trim()) return false

    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      // Refresh messages after editing
      await fetchMessages(true) // Force refresh
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit message')
      return false
    }
  }, [fetchMessages])

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      // Refresh messages after deleting
      await fetchMessages(true) // Force refresh
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message')
      return false
    }
  }, [fetchMessages])

  const markAsRead = useCallback(async () => {
    if (!conversationId) return

    try {
      const response = await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Immediately fetch updated messages to show read receipts
        await fetchMessages(true)
        
        // Also trigger a broader cache invalidation for notifications/unread counts
        // This helps update the navbar badge and other components
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('messagesRead', { 
            detail: { conversationId } 
          }))
        }
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err)
    }
  }, [conversationId, fetchMessages])

  useEffect(() => {
    fetchMessages(true) // Force initial fetch
  }, [conversationId])

  // Set up polling for real-time updates (reduced frequency)
  useEffect(() => {
    if (!conversationId) return

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      fetchMessages() // Regular polling without force
    }, 5000) // 5 seconds for faster read receipts

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [conversationId])

  return {
    messages,
    loading,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead,
    refetch: () => fetchMessages(true) // Force refresh when manually called
  }
}
