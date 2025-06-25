'use client'
import { useState, useCallback } from 'react'

export function useModalState() {
    const [newComment, setNewComment] = useState('')
    const [replyingTo, setReplyingTo] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

    // Start replying to a comment
    const startReply = useCallback((commentId: string) => {
        setReplyingTo(commentId)
        setReplyText('')
    }, [])

    // Cancel reply
    const cancelReply = useCallback(() => {
        setReplyingTo(null)
        setReplyText('')
    }, [])

    return {
        newComment,
        setNewComment,
        replyingTo,
        replyText,
        setReplyText,
        showDeleteConfirm,
        setShowDeleteConfirm,
        startReply,
        cancelReply
    }
}