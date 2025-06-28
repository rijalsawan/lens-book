import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  name: string
  username: string
  avatar: string
}

interface Conversation {
  id: string
  participants: User[]
  lastMessage?: {
    content: string
    createdAt: string
    sender: User
    isRead: boolean
  }
  unreadCount: number
  updatedAt: string
}

export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/conversations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversations')
      }

      const data = await response.json()
      setConversations(data.conversations)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  const startConversation = useCallback(async (participantId: string) => {
    try {
      const response = await fetch('/api/conversations/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId })
      })

      if (!response.ok) {
        throw new Error('Failed to start conversation')
      }

      const data = await response.json()
      return data.conversationId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start conversation')
      return null
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Set up polling for real-time updates (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations()
    }, 30000) // Reduced to 30 seconds for conversations list

    return () => clearInterval(interval)
  }, [fetchConversations])

  return {
    conversations,
    loading,
    error,
    startConversation,
    refetch: fetchConversations
  }
}
