'use client'
import { useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

interface FollowUser {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  isFollowing: boolean
  followedAt?: string
}

export function useFollow() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  // Follow/Unfollow a user
  const toggleFollow = useCallback(async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!user || loading) return null
    
    setLoading(true)
    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId,
          action: currentlyFollowing ? 'unfollow' : 'follow'
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        toast.success(result.message)
        return {
          success: true,
          isFollowing: result.isFollowing,
          targetUserId
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update follow status')
      }
    } catch (error) {
      console.error('Error updating follow status:', error)
      toast.error('Failed to update follow status')
      return null
    } finally {
      setLoading(false)
    }
  }, [user, loading])

  // Remove a follower (for own profile)
  const removeFollower = useCallback(async (followerUserId: string) => {
    if (!user || loading) return null
    
    setLoading(true)
    try {
      const response = await fetch('/api/removefollower', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followerUserId
        }),
      })
      
      if (response.ok) {
        const result = await response.json()
        return {
          success: true,
          message: result.message
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove follower')
      }
    } catch (error) {
      console.error('Error removing follower:', error)
      toast.error('Failed to remove follower')
      return null
    } finally {
      setLoading(false)
    }
  }, [user, loading])

  // Get follow status
  const getFollowStatus = useCallback(async (targetUserId: string) => {
    if (!user) return false
    
    try {
      const response = await fetch(`/api/follow?targetUserId=${targetUserId}`)
      if (response.ok) {
        const result = await response.json()
        return result.isFollowing
      }
      return false
    } catch (error) {
      console.error('Error getting follow status:', error)
      return false
    }
  }, [user])

  // Get followers list
  const getFollowers = useCallback(async (userId: string, page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/getfollowers?userId=${userId}&page=${page}&limit=${limit}`)
      if (response.ok) {
        return await response.json()
      }
      throw new Error('Failed to fetch followers')
    } catch (error) {
      console.error('Error fetching followers:', error)
      toast.error('Failed to load followers')
      return { followers: [], total: 0, hasMore: false }
    }
  }, [])

  // Get following list
  const getFollowing = useCallback(async (userId: string, page = 1, limit = 20) => {
    try {
      const response = await fetch(`/api/getfollowing?userId=${userId}&page=${page}&limit=${limit}`)
      if (response.ok) {
        return await response.json()
      }
      throw new Error('Failed to fetch following')
    } catch (error) {
      console.error('Error fetching following:', error)
      toast.error('Failed to load following')
      return { following: [], total: 0, hasMore: false }
    }
  }, [])

  return {
    toggleFollow,
    removeFollower,
    getFollowStatus,
    getFollowers,
    getFollowing,
    loading
  }
}