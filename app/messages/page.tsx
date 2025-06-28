'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Messages</h1>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex bg-white rounded-xl p-1 mb-6 shadow-sm"
        >
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'conversations'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab('followers')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'followers'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Start New Chat
          </button>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'conversations' ? (
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No conversations yet</h3>
                  <p className="text-gray-500">Start chatting with your followers!</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    currentUserId={user?.id || ''}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="followers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {filteredFollowers.length === 0 ? (
                <div className="text-center py-12">
                  <Plus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No followers found</h3>
                  <p className="text-gray-500">Get some followers to start chatting!</p>
                </div>
              ) : (
                filteredFollowers.map((follower) => (
                  <FollowerItem
                    key={follower.id}
                    follower={follower}
                    onStartChat={() => handleStartConversation(follower.id)}
                  />
                ))
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
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        href={`/messages/${conversation.id}`}
        className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100"
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
              {otherParticipant?.avatar ? (
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {otherParticipant?.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {conversation.unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-medium">
                  {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">
                {otherParticipant?.name || otherParticipant?.username}
              </h3>
              {conversation.lastMessage && (
                <span className="text-xs text-gray-500">
                  {new Date(conversation.lastMessage.createdAt).toLocaleDateString()}
                </span>
              )}
            </div>
            
            {conversation.lastMessage ? (
              <p className={`text-sm truncate ${
                conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
              }`}>
                {conversation.lastMessage.sender.id === currentUserId ? 'You: ' : ''}
                {conversation.lastMessage.content}
              </p>
            ) : (
              <p className="text-sm text-gray-500">Start your conversation</p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

const FollowerItem = ({ follower, onStartChat }: { follower: User; onStartChat: () => void }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onStartChat}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all border border-gray-100 cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
          {follower.avatar ? (
            <img
              src={follower.avatar}
              alt={follower.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
              {follower.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {follower.name || follower.username}
          </h3>
          <p className="text-sm text-gray-500">@{follower.username}</p>
        </div>
        <div className="text-blue-500">
          <MessageCircle className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  )
}
