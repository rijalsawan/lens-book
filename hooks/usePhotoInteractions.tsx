import { useState } from 'react'
import toast from 'react-hot-toast'

export const usePhotoInteractions = () => {
    const [loading, setLoading] = useState(false)

    const toggleLike = async (photoId: string) => {
        try {
            setLoading(true)
            const response = await fetch('/api/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoId })
            })
            
            // Check if response is ok before parsing JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const result = await response.json()
            
            if (result.success) {
                if (result.liked) {
                    toast.success('Photo liked!')
                } else {
                    toast.success('Photo unliked!')
                    // Optionally show notification deletion feedback
                    if (result.notificationsDeleted) {
                        console.log('Like notifications cleaned up')
                    }
                }
            } else {
                toast.error(result.error || 'Failed to toggle like')
            }
            
            return result
        } catch (error) {
            console.error('Error toggling like:', error)
            toast.error('Failed to toggle like')
            return { success: false }
        } finally {
            setLoading(false)
        }
    }

    const addComment = async (photoId: string, text: string) => {
        try {
            setLoading(true)
            
            console.log('Adding comment:', { photoId, text }) // Debug log
            
            const response = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoId, text })
            })
            
            // Check if response is ok before parsing JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const result = await response.json()
            
            console.log('Comment API response:', result) // Debug log
            
            if (result.success) {
                toast.success('Comment added!')
                return result
            } else {
                toast.error(result.error || 'Failed to add comment')
                return { success: false, error: result.error }
            }
        } catch (error) {
            console.error('Error adding comment:', error)
            toast.error('Failed to add comment')
            return { success: false, error: 'Network error' }
        } finally {
            setLoading(false)
        }
    }

    const addReply = async (commentId: string, text: string) => {
    try {
        setLoading(true)
        
        console.log('Adding reply:', { commentId, text }) // Debug log
        
        const response = await fetch('/api/reply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ commentId, text })
        })
        
        console.log('Reply response status:', response.status) // Debug log
        
        // Check if response is ok before parsing JSON
        if (!response.ok) {
            const errorText = await response.text()
            console.error('Reply API error:', errorText)
            throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`)
        }
        
        // Get response text first to check if it's empty
        const responseText = await response.text()
        console.log('Reply raw response:', responseText) // Debug log
        
        if (!responseText) {
            throw new Error('Empty response received')
        }

        // Try to parse JSON
        let result
        try {
            result = JSON.parse(responseText)
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
            throw new Error(`Invalid JSON response: ${responseText}`)
        }
        
        console.log('Reply API response:', result) // Debug log
        
        if (result) {
            toast.success('Reply added!')
            return result
        } else {
            const errorMessage = result?.error || 'Failed to add reply'
            console.error('Reply failed:', errorMessage)
            toast.error(errorMessage)
            return { success: false, error: errorMessage }
        }
    } catch (error) {
        console.error('Error adding reply:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        toast.error('Failed to add reply: ' + errorMessage)
        return { success: false, error: errorMessage }
    } finally {
        setLoading(false)
    }
}

    const deleteComment = async (commentId: string) => {
        try {
            setLoading(true)
            const response = await fetch(`/api/deletecomment`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commentId })
            })
            
            // Check if response is ok before parsing JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            
            const result = await response.json()
            
            if (result.success) {
                toast.success('Comment deleted!')
                // Show notification cleanup feedback
                if (result.notificationsDeleted) {
                    console.log('Comment notifications cleaned up')
                }
            } else {
                toast.error(result.error || 'Failed to delete comment')
            }
            
            return result
        } catch (error) {
            console.error('Error deleting comment:', error)
            toast.error('Failed to delete comment')
            return { success: false }
        } finally {
            setLoading(false)
        }
    }

    const fetchComments = async (photoId: string) => {
        try {
            console.log('Fetching comments for photo:', photoId) // Debug log
            
            const response = await fetch(`/api/comments?photoId=${photoId}`)
            
            // Check if response is ok
            if (!response.ok) {
                console.error(`HTTP error! status: ${response.status}`)
                return []
            }

            // Check if response has content
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                console.error('Response is not JSON:', contentType)
                return []
            }

            // Get response text first to check if it's empty
            const responseText = await response.text()
            
            if (!responseText) {
                console.error('Empty response received')
                return []
            }

            // Try to parse JSON
            let result
            try {
                result = JSON.parse(responseText)
            } catch (parseError) {
                console.error('JSON parse error:', parseError)
                console.error('Response text:', responseText)
                return []
            }
            
            console.log('Fetch comments response:', result) // Debug log
            
            if (result && result.success) {
                return result.comments || []
            } else {
                console.error('Failed to fetch comments:', result?.error || 'Unknown error')
                return []
            }
        } catch (error) {
            console.error('Error fetching comments:', error)
            return []
        }
    }

    const canDeleteComment = (comment: any, photoOwnerId?: string) => {
        // Add your logic here
        return true
    }

    return {
        toggleLike,
        addComment,
        addReply,
        deleteComment,
        fetchComments,
        canDeleteComment,
        loading
    }
}