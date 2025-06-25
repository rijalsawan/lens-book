'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export default function SSETest() {
  const { user } = useUser()
  const [messages, setMessages] = useState<string[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const eventSource = new EventSource('/api/notifications/stream')
    
    eventSource.onopen = () => {
      setConnected(true)
      setMessages(prev => [...prev, 'SSE Connection opened'])
    }

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setMessages(prev => [...prev, `Received: ${JSON.stringify(data)}`])
    }

    eventSource.onerror = (error) => {
      setConnected(false)
      setMessages(prev => [...prev, `Error: ${error}`])
    }

    return () => {
      eventSource.close()
      setConnected(false)
    }
  }, [user?.id])

  const createTestNotification = async () => {
    try {
      const response = await fetch('/api/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          actionUserId: 'test-user-id',
          type: 'like',
          title: 'Test Notification',
          message: 'This is a test notification'
        })
      })
      
      if (response.ok) {
        setMessages(prev => [...prev, 'Test notification created'])
      }
    } catch (error) {
      setMessages(prev => [...prev, `Error creating notification: ${error}`])
    }
  }

  if (!user) {
    return <div>Please log in to test SSE</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSE Test Page</h1>
      
      <div className="mb-4">
        <div className={`px-4 py-2 rounded ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Status: {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <button 
        onClick={createTestNotification}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
      >
        Create Test Notification
      </button>

      <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
        <h3 className="font-bold mb-2">Messages:</h3>
        {messages.map((message, index) => (
          <div key={index} className="text-sm mb-1 font-mono">
            {new Date().toLocaleTimeString()}: {message}
          </div>
        ))}
      </div>
    </div>
  )
}
