'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Send,
  Clock,
  CheckCheck
} from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useConversations } from '@/hooks/useConversations'

interface User {
  id: string
  name: string
  username: string
  avatar: string
}

export default function MessagesPage() {
  const { user } = useUser()
  const router = useRouter()
  const { conversations, loading: conversationsLoading, startConversation } = useConversations()
  const [followers, setFollowers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'conversations' | 'followers'>('conversations')

  useEffect(() => {
    if (user) {
      fetchFollowers()
    }
  }, [user])

  useEffect(() => {
    if (!conversationsLoading) {
      setLoading(false)
    }
  }, [conversationsLoading])

  const fetchFollowers = async () => {
    try {
      const response = await fetch('/api/getfollowers?userId=' + user?.id)
      if (response.ok) {
        const data = await response.json()
        setFollowers(data.followers)
      }
    } catch (error) {
      console.error('Error fetching followers:', error)
    }
  }

  const handleStartConversation = async (userId: string) => {
    const conversationId = await startConversation(userId)
    if (conversationId) {
      router.push(`/messages/${conversationId}`)
    }
  }

  const filteredConversations = conversations.filter(conversation =>
    conversation.participants.some(participant =>
      participant.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const filteredFollowers = followers.filter(follower =>
    follower.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    follower.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white pt-16 lg:pt-0">
      {/* Header */}
      <div className="sticky top-16 lg:top-0 lg:mt-20 lg:w-1/2 lg:mx-auto bg-white border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Send className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 mb-4">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'conversations'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                activeTab === 'followers'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              New Chat
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'conversations' ? (
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500 text-center mb-6">
                    Start a conversation with your followers
                  </p>
                  <button
                    onClick={() => setActiveTab('followers')}
                    className="bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                  >
                    Send message
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredConversations.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      currentUserId={user?.id || ''}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="followers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {filteredFollowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-8">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Plus className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No followers found</h3>
                  <p className="text-gray-500 text-center">
                    Get some followers to start chatting!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredFollowers.map((follower) => (
                    <FollowerItem
                      key={follower.id}
                      follower={follower}
                      onStartChat={() => handleStartConversation(follower.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

const ConversationItem = ({ conversation, currentUserId }: { conversation: any; currentUserId: string }) => {
  const otherParticipant = conversation.participants.find((p: any) => p.id !== currentUserId)
  
  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="block px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
              {otherParticipant?.avatar ? (
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-semibold text-slate-700 text-lg">
                  {otherParticipant?.username?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          </div>
          {conversation.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {otherParticipant?.name || otherParticipant?.username}
            </h3>
            <div className="flex items-center space-x-1">
              {conversation.lastMessage && (
                <>
                  {conversation.lastMessage.sender.id === currentUserId && (
                    <CheckCheck className="w-4 h-4 text-blue-500" />
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(conversation.lastMessage.createdAt)}
                  </span>
                </>
              )}
            </div>
          </div>
          
          {conversation.lastMessage ? (
            <div className="flex items-center space-x-2">
              <p className={`text-sm truncate flex-1 ${
                conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {conversation.lastMessage.sender.id === currentUserId ? 'You: ' : ''}
                {conversation.lastMessage.content}
              </p>
              {conversation.unreadCount > 0 && (
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Start your conversation</p>
          )}
        </div>
      </div>
    </Link>
  )
}

const FollowerItem = ({ follower, onStartChat }: { follower: User; onStartChat: () => void }) => {
  return (
    <button
      onClick={onStartChat}
      className="w-full px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
            {follower.avatar ? (
              <img
                src={follower.avatar}
                alt={follower.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-slate-700 text-lg">
                {follower.username?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-gray-900">
            {follower.name || follower.username}
          </h3>
          <p className="text-sm text-gray-500">@{follower.username}</p>
        </div>
        
        {/* Message Icon */}
        <div className="text-gray-400">
          <MessageCircle className="w-5 h-5" />
        </div>
      </div>
    </button>
  )
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return `${Math.floor(seconds / 604800)}w`
}
