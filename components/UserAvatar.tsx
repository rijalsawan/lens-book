import React from 'react';

interface UserAvatarProps {
    avatarUrl: string;
    username: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ avatarUrl, username }) => {
    return (
        <div className="flex items-center">
            <img
                src={avatarUrl}
                alt={`${username}'s avatar`}
                className="w-10 h-10 rounded-full border border-gray-300"
            />
            <span className="ml-2 text-sm font-semibold">{username}</span>
        </div>
    );
};

export default UserAvatar;