export interface Notification {
    id: string
    type: 'like' | 'comment' | 'follow' | 'mention' | 'reply'
    title: string
    message: string
    data: {
        photoId?: string
        userId?: string
        commentId?: string
        replyId?: string
        actionUserId: string
        actionUserName: string
        actionUserAvatar?: string
    }
    isRead: boolean
    createdAt: string
    userId: string // recipient user ID
}

export interface NotificationPreferences {
    likes: boolean
    comments: boolean
    follows: boolean
    mentions: boolean
    replies: boolean
    emailNotifications: boolean
    pushNotifications: boolean
}