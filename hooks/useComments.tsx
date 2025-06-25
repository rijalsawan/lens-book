import { useState, useEffect } from 'react';

interface Comment {
    id: string;
    content: string;
    userId: string;
    photoId: string;
    createdAt: Date;
}

const useComments = (photoId: string) => {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState<string>('');

    const fetchComments = async (photoId: string): Promise<Comment[]> => {
        const response = await fetch(`/api/comments?photoId=${photoId}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    };

    const postComment = async (photoId: string, text: string) => {
    try {
        setLoading(true)
        
        console.log('Adding comment:', { photoId, text }) // Debug log
        
        const response = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoId, text })
        })
        
        console.log('Response status:', response.status) // Debug log
        console.log('Response ok:', response.ok) // Debug log
        
        // Get response text first to see what we're getting
        const responseText = await response.text()
        console.log('Raw response:', responseText) // Debug log
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, response: ${responseText}`)
        }
        
        // Try to parse JSON
        let result
        try {
            result = JSON.parse(responseText)
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
            throw new Error(`Invalid JSON response: ${responseText}`)
        }
        
        console.log('Comment API response:', result) // Debug log
        
        if (result.success) {
            return result
        } else {
            return { success: false, error: result.error }
        }
    } catch (error) {
        console.error('Error adding comment:', error)
        return { success: false, error: error }
    } finally {
        setLoading(false)
    }
}

    useEffect(() => {
        const loadComments = async () => {
            try {
                const fetchedComments = await fetchComments(photoId);
                setComments(fetchedComments);
            } catch (err) {
                setError('Failed to load comments');
            } finally {
                setLoading(false);
            }
        };

        loadComments();
    }, [photoId]);

    const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setNewComment(event.target.value);
    };

    const handleCommentSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newComment.trim()) return;

        try {
            const addedComment = await postComment(photoId, newComment);
            setComments((prev) => [...prev, addedComment]);
            setNewComment('');
        } catch (err) {
            setError('Failed to post comment');
        }
    };

    return {
        comments,
        loading,
        error,
        newComment,
        handleCommentChange,
        handleCommentSubmit,
    };
};

export default useComments;