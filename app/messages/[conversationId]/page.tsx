'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, ArrowLeft, MoreVertical, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { useParams, useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useMessages } from '@/hooks/useMessages'

interface User {
  id: string
  name: string
  username: string
  avatar: string
}

interface Message {
  id: string
  content: string
  createdAt: string
  updatedAt: string
  isEdited: boolean
  isDeleted: boolean
  sender: User
  reads: { userId: string; readAt: string }[]
}

interface Conversation {
  id: string
  participants: User[]
}

export default function ConversationPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useUser()
  const conversationId = params.conversationId as string
  
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    editMessage,
    deleteMessage,
    markAsRead
  } = useMessages(conversationId)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}`)
      if (response.ok) {
        const data = await response.json()
        setConversation(data.conversation)
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }, [conversationId])

  useEffect(() => {
    if (user && conversationId) {
      fetchConversation()
      // Mark as read immediately when opening conversation
      markAsRead()
    }
  }, [user, conversationId, markAsRead, fetchConversation])

  // Mark messages as read when new messages arrive (if user is on the page)
  useEffect(() => {
    if (messages.length > 0 && user && conversationId) {
      // Check if there are any unread messages from other users
      const hasUnreadFromOthers = messages.some(message => 
        message.sender.id !== user.id && 
        message.reads.length === 0
      )
      
      if (hasUnreadFromOthers) {
        // Mark as read after a short delay to ensure user has seen the messages
        const timer = setTimeout(() => {
          markAsRead()
        }, 1000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [messages, user, conversationId, markAsRead])

  useEffect(() => {
    if (!messagesLoading) {
      setLoading(false)
    }
  }, [messagesLoading])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Mark messages as read when user becomes active on the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && conversationId) {
        markAsRead()
      }
    }

    const handleFocus = () => {
      if (user && conversationId) {
        markAsRead()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user, conversationId, markAsRead])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    const success = await sendMessage(newMessage)
    if (success) {
      setNewMessage('')
    }
    setSending(false)
  }

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id)
    setEditingContent(message.content)
    setMenuOpen(null)
  }

  const cancelEditing = () => {
    setEditingMessageId(null)
    setEditingContent('')
  }

  const saveEdit = async () => {
    if (!editingContent.trim() || !editingMessageId) return

    const success = await editMessage(editingMessageId, editingContent)
    if (success) {
      cancelEditing()
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    const success = await deleteMessage(messageId)
    if (success) {
      setShowDeleteModal(null)
    }
  }

  const otherParticipant = conversation?.participants.find(p => p.id !== user?.id)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-600">Conversation not found</h2>
          <Link href="/messages" className="text-blue-500 hover:underline mt-2 block">
            Back to messages
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center space-x-4 fixed top-0 left-0 right-0 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/messages')}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </motion.button>
        
        <div className="flex items-center space-x-3 flex-1">
          <div className="relative">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200 ring-2 ring-gray-100">
              {otherParticipant?.avatar ? (
                <img
                  src={otherParticipant.avatar}
                  alt={otherParticipant.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-lg">
                  {otherParticipant?.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Online status indicator */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 text-lg">
              {otherParticipant?.name || otherParticipant?.username}
            </h2>
            <p className="text-sm text-gray-500">Active now</p>
          </div>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 items-end max-sm:mb-25 overflow-y-auto px-4 py-6 space-y-4 pb-24 sm:pb-6 pt-20">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender.id === user?.id}
              isEditing={editingMessageId === message.id}
              editingContent={editingContent}
              setEditingContent={setEditingContent}
              onSaveEdit={saveEdit}
              onCancelEdit={cancelEditing}
              onStartEdit={() => startEditing(message)}
              onDelete={() => setShowDeleteModal(message.id)}
              menuOpen={menuOpen === message.id}
              setMenuOpen={() => setMenuOpen(menuOpen === message.id ? null : message.id)}
            />
          ))}
          
          {/* Typing indicator placeholder - can be enhanced later */}
          {/* {isOtherUserTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mb-4"
            >
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </motion.div>
          )} */}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-t border-gray-100 px-4 py-4 fixed bottom-16 left-0 right-0 z-50 sm:sticky sm:bottom-0 sm:z-auto"
      >
        <div className="flex items-end space-x-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Message..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              disabled={sending}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-sm mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Message</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to delete this message? This action cannot be undone.</p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteMessage(showDeleteModal)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const MessageBubble = ({
  message,
  isOwn,
  isEditing,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  menuOpen,
  setMenuOpen
}: {
  message: Message
  isOwn: boolean
  isEditing: boolean
  editingContent: string
  setEditingContent: (content: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onStartEdit: () => void
  onDelete: () => void
  menuOpen: boolean
  setMenuOpen: () => void
}) => {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getReadStatus = () => {
    const isRead = message.reads.length > 0
    // For very recent messages (less than 5 seconds), show "Sending..." briefly
    const messageAge = Date.now() - new Date(message.createdAt).getTime()
    if (messageAge < 2000 && !isRead) {
      return 'Sending...'
    }
    return isRead ? 'Read' : 'Delivered'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
        <div className="group relative">
          {isEditing ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-end space-x-3">
                <input
                  type="text"
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && onSaveEdit()}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  placeholder="Edit message..."
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onSaveEdit}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={onCancelEdit}
                  className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start space-x-2">
                <div
                  className={`px-4 py-3 rounded-2xl max-w-full break-words ${
                    isOwn
                      ? 'bg-blue-500 text-white rounded-br-lg'
                      : 'bg-gray-100 text-gray-900 rounded-bl-lg'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  {message.isEdited && (
                    <p className="text-xs opacity-70 mt-1 italic">edited</p>
                  )}
                </div>
                
                {isOwn && (
                  <div className="mt-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={setMenuOpen}
                      className=" group-hover:opacity-100 p-1 hover:bg-gray-100 rounded-full transition-all duration-200"
                    >
                      <MoreVertical className="w-4 h-4 text-gray-600" />
                    </motion.button>
                    
                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: -10 }}
                          className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-20 min-w-[120px]"
                        >
                          <button
                            onClick={onStartEdit}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={onDelete}
                            className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <div className={`flex items-center mt-1 space-x-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-xs text-gray-500">
            {formatTime(message.createdAt)}
          </span>
          {isOwn && (
            <>
              <span className="text-xs text-gray-400">•</span>
              <motion.span 
                key={getReadStatus()} // Re-animate when status changes
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-xs text-gray-500"
              >
                {getReadStatus()}
              </motion.span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}
