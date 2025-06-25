"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Users,
  Heart,
  Grid,
  Bookmark,
  X,
  MessageCircle,
  Send,
  UserMinus,
  UserPlus,
  Trash2,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePhotoInteractions } from "../../hooks/usePhotoInteractions";
import { usePhotosState } from "../../hooks/usePhotosState";
import { useModalState } from "../../hooks/useModalState";
import { useFollow } from "../../hooks/useFollow";
import { Edit, MoreVertical, Check, MapPin, Loader2, Save, ImageIcon } from "lucide-react";

interface UserStats {
  photos: number;
  likes: number;
  followers: number;
  following: number;
}

interface Photo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  location?: string;
  stats?: {
    likeCount: number;
    commentCount: number;
  };
  createdAt: string;
  isLiked?: boolean;
  userId: string;
  likeCount: number;
  commentCount: number;
  user: any;
}

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
  };
  createdAt: string;
  replies?: Comment[];
}

interface FollowUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  isFollowing: boolean;
  followedAt?: string;
}

interface User {
  id: string;
  name?: string;
  username?: string;
  imageUrl?: string;
  createdAt?: string;
  bio?: string;
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();

  const [stats, setStats] = useState<UserStats>({
    photos: 0,
    likes: 0,
    followers: 0,
    following: 0,
  });
  const [activeTab, setActiveTab] = useState<"photos" | "saved">("photos");
  const [loading, setLoading] = useState(true);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Photo deletion states
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState<
    string | null
  >(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  // Photo editing states
  const [showEditPhotoModal, setShowEditPhotoModal] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    location: ''
  });

  // Follow modal states
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [followersHasMore, setFollowersHasMore] = useState(false);
  const [followingHasMore, setFollowingHasMore] = useState(false);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [followActionLoading, setFollowActionLoading] = useState<string | null>(
    null
  );

  // Use custom hooks for photo interactions
  const {
    toggleLike,
    addComment: addCommentAPI,
    addReply: addReplyAPI,
    deleteComment: deleteCommentAPI,
    fetchComments,
    canDeleteComment,
    loading: interactionLoading,
  } = usePhotoInteractions();

  const {
    photos,
    comments,
    selectedPhoto,
    updatePhotoLike,
    updatePhotoCommentCount,
    addComment: addCommentToState,
    addReply: addReplyToState,
    removeComment,
    setPhotosData,
    setCommentsData,
    setSelectedPhotoData,
  } = usePhotosState();

  const {
    newComment,
    setNewComment,
    replyingTo,
    replyText,
    setReplyText,
    showDeleteConfirm,
    setShowDeleteConfirm,
    startReply,
    cancelReply,
  } = useModalState();

  const { toggleFollow, removeFollower, getFollowers, getFollowing } =
    useFollow();

  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetchUserData();
      fetchUser();
    }
  }, [isLoaded, clerkUser]);

  const fetchUser = async () => {
    if (!clerkUser) return;
    try {
      setLoading(true);

      // Fetch user profile data
      const userResponse = await fetch(`/api/getuserbyid?id=${clerkUser.id}`);
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUser(userData.user);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    if (!clerkUser) return;

    try {
      setLoading(true);

      // Fetch user photos with like status
      const photosResponse = await fetch(`/api/photos?userId=${clerkUser.id}`);
      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        console.log("Fetched photos:", photosData.photos);
        setPhotosData(photosData.photos);
      }

      // Fetch user stats
      const statsResponse = await fetch(`/api/stats?userId=${clerkUser.id}`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast.error("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = async (photo: Photo) => {
    // Add the user property before passing to setSelectedPhotoData
    const photoWithUser = { ...photo, user: { id: photo.userId } };
    setSelectedPhotoData(photoWithUser);
    const commentsData = await fetchComments(photo.id);
    setCommentsData(commentsData);
  };

  const handleLike = async (photoId: string) => {
    const result = await toggleLike(photoId);
    if (result?.success) {
      updatePhotoLike(photoId, result.liked);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto || !newComment.trim()) return;

    const result = await addCommentAPI(selectedPhoto.id, newComment);
    if (result?.success) {
      addCommentToState(result.comment);
      updatePhotoCommentCount(selectedPhoto.id, 1);
      setNewComment("");
    }
  };

  const handleReply = async (e: React.FormEvent, commentId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    console.log("Handling reply:", { commentId, replyText });

    const result = await addReplyAPI(commentId, replyText);

    console.log("Reply result:", result);

    if (result) {
      console.log("Reply successful, updating state");
      addReplyToState(commentId, result.reply);
      updatePhotoCommentCount(selectedPhoto!.id, 1);
      cancelReply();
      toast.success("Reply added successfully!");
    } else {
      console.error("Reply failed:", result);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(commentId);
    const result = await deleteCommentAPI(commentId);
    if (result?.success) {
      // Use the returned deletedCount from the API
      const deletedCount = result.deletedCount || 1;
      removeComment(commentId);
      updatePhotoCommentCount(selectedPhoto!.id, -deletedCount);
      setShowDeleteConfirm(null);
    }
    setDeletingComment(null);
  };

  // Photo deletion functions
  const handleDeletePhotoClick = (photoId: string) => {
    setShowDeletePhotoConfirm(photoId);
  };

  const confirmDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId);
      const response = await fetch(`/api/deletephoto?photoId=${photoId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        // Remove photo from state
        setPhotosData(photos.filter((photo: Photo) => photo.id !== photoId));
        // Update stats
        setStats((prev) => ({
          ...prev,
          photos: prev.photos - 1,
        }));
        toast.success("Photo deleted successfully");
        closeModal();
      } else {
        toast.error(data.error || "Failed to delete photo");
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    } finally {
      setDeletingPhoto(null);
      setShowDeletePhotoConfirm(null);
    }
  };

  const cancelDeletePhoto = () => {
    setShowDeletePhotoConfirm(null);
  };

  // Photo editing functions
  const handleEditPhotoClick = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      setEditFormData({
        title: photo.title || '',
        description: photo.description || '',
        location: photo.location || ''
      });
      setShowEditPhotoModal(photoId);
    }
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const confirmEditPhoto = async (photoId: string) => {
    try {
      setEditingPhoto(photoId);
      const response = await fetch(`/api/editphoto?photoid=${photoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json();

      if (response.ok) {
        // Update photo in state
        setPhotosData(photos.map((photo: Photo) => 
          photo.id === photoId 
            ? { ...photo, ...editFormData, user: photo.user || { id: photo.userId } }
            : photo
        ));
        
        // Update selected photo if it's currently open
        if (selectedPhoto && selectedPhoto.id === photoId) {
          setSelectedPhotoData({ ...selectedPhoto, ...editFormData });
        }
        
        toast.success("Photo updated successfully");
        setShowEditPhotoModal(null);
      } else {
        toast.error(data.error || "Failed to update photo");
      }
    } catch (error) {
      console.error("Error updating photo:", error);
      toast.error("Failed to update photo");
    } finally {
      setEditingPhoto(null);
    }
  };

  const cancelEditPhoto = () => {
    setShowEditPhotoModal(null);
    setEditFormData({
      title: '',
      description: '',
      location: ''
    });
  };

  // Follow/Unfollow functionality
  const handleFollowInModal = async (
    userId: string,
    currentlyFollowing: boolean
  ) => {
    setFollowActionLoading(userId);
    const result = await toggleFollow(userId, currentlyFollowing);
    if (result?.success) {
      // Update followers list
      setFollowers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isFollowing: result.isFollowing }
            : user
        )
      );

      // Update following list
      setFollowing((prev) =>
        prev.map((user) =>
          user.id === userId
            ? { ...user, isFollowing: result.isFollowing }
            : user
        )
      );
    }
    setFollowActionLoading(null);
  };

  const handleRemoveFollower = async (userId: string) => {
    setRemovingUser(userId);
    const result = await removeFollower(userId);
    if (result?.success) {
      // Remove from followers list
      setFollowers((prev) => prev.filter((user) => user.id !== userId));
      // Update stats
      setStats((prev) => ({
        ...prev,
        followers: prev.followers - 1,
      }));
    }
    setRemovingUser(null);
  };

  const handleUnfollow = async (userId: string) => {
    setFollowActionLoading(userId);
    const result = await toggleFollow(userId, true); // true means currently following
    if (result?.success) {
      // Remove from following list
      setFollowing((prev) => prev.filter((user) => user.id !== userId));
      // Update stats
      setStats((prev) => ({
        ...prev,
        following: prev.following - 1,
      }));
    }
    setFollowActionLoading(null);
  };

  // Load followers/following
  const loadFollowers = async (page = 1, reset = false) => {
    if (!clerkUser || loadingFollowers) return;

    setLoadingFollowers(true);
    try {
      const data = await getFollowers(clerkUser.id, page);
      if (reset) {
        setFollowers(data.followers);
      } else {
        setFollowers((prev) => [...prev, ...data.followers]);
      }
      setFollowersHasMore(data.hasMore);
      setFollowersPage(page);
    } catch (error) {
      console.error("Error loading followers:", error);
    } finally {
      setLoadingFollowers(false);
    }
  };

  const loadFollowing = async (page = 1, reset = false) => {
    if (!clerkUser || loadingFollowing) return;

    setLoadingFollowing(true);
    try {
      const data = await getFollowing(clerkUser.id, page);
      if (reset) {
        setFollowing(data.following);
      } else {
        setFollowing((prev) => [...prev, ...data.following]);
      }
      setFollowingHasMore(data.hasMore);
      setFollowingPage(page);
    } catch (error) {
      console.error("Error loading following:", error);
    } finally {
      setLoadingFollowing(false);
    }
  };

  const handleFollowersClick = () => {
    setShowFollowersModal(true);
    loadFollowers(1, true);
  };

  const handleFollowingClick = () => {
    setShowFollowingModal(true);
    loadFollowing(1, true);
  };

  const closeModal = () => {
    setSelectedPhotoData(null);
    setNewComment("");
    cancelReply();
    setShowDeleteConfirm(null);
    setShowDeletePhotoConfirm(null);
    setShowEditPhotoModal(null);
  };

  // ...existing code for loading states and auth checks...

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!clerkUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Please sign in
          </h1>
          <Link href="/sign-in" className="text-blue-500 hover:text-blue-700">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-sm:my-18 max-sm:shadow-2xl my-8 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-3xl shadow-sm p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Profile Image */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 p-1">
                <div className="w-full h-full rounded-full overflow-hidden bg-white">
                  {clerkUser.imageUrl ? (
                    <img
                      src={clerkUser.imageUrl}
                      alt={clerkUser.firstName || "Profile"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <Camera className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {clerkUser.firstName && clerkUser.lastName
                      ? `${clerkUser.firstName} ${clerkUser.lastName}`
                      : clerkUser.username || "Anonymous User"}
                  </h1>
                  <p className="text-gray-600 text-lg">
                    @{user?.username || "username"}
                  </p>
                  {user?.bio && (
                    <p className="text-gray-700 mt-3 max-w-md">{user.bio}</p>
                  )}
                </div>
                <Link
                  href="/settings"
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </Link>
              </div>

              {/* Stats */}
              <div className="flex gap-8 justify-center md:justify-start">
                <div className="text-center">
                  <div className="text-2xl text-gray-900">
                    {stats.photos}
                  </div>
                  <div className="text-gray-600">Photos</div>
                </div>
                <button
                  onClick={handleFollowersClick}
                  className="text-center cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="text-2xl text-gray-900">
                    {stats.followers}
                  </div>
                  <div className="text-gray-600">Followers</div>
                </button>
                <button
                  onClick={handleFollowingClick}
                  className="text-center cursor-pointer hover:text-blue-600 transition-colors"
                >
                  <div className="text-2xl text-gray-900">
                    {stats.following}
                  </div>
                  <div className="text-gray-600">Following</div>
                </button>
                <div className="text-center">
                  <div className="text-2xl text-gray-900">
                    {stats.likes}
                  </div>
                  <div className="text-gray-600">Likes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {activeTab === "photos" &&
              (photos.length > 0 ? (
                <PhotoGrid 
                  photos={photos} 
                  onPhotoClick={handlePhotoClick}
                  onEditClick={handleEditPhotoClick}
                  currentUserId={clerkUser.id}
                />
              ) : (
                <EmptyState
                  icon={Camera}
                  title="No photos yet"
                  description="Share your first photo to get started!"
                  actionLabel="Upload Photo"
                  actionHref="/addphoto"
                />
              ))}

            {activeTab === "saved" && (
              <EmptyState
                icon={Bookmark}
                title="No saved photos"
                description="Photos you save will appear here"
              />
            )}
          </>
        )}
      </div>
    
            {/* Photo Modal */}
            <AnimatePresence>
              {selectedPhoto && (
                <PhotoModal
                  photo={selectedPhoto}
                  comments={comments}
                  newComment={newComment}
                  setNewComment={setNewComment}
                  onClose={closeModal}
                  onLike={() => handleLike(selectedPhoto.id)}
                  onComment={handleComment}
                  isCommenting={interactionLoading}
                  currentUser={clerkUser}
                  replyingTo={replyingTo}
                  setReplyingTo={startReply}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  onReply={handleReply}
                  isReplying={interactionLoading}
                  onDeleteComment={handleDeleteComment}
                  canDeleteComment={(comment) => canDeleteComment(comment, selectedPhoto.userId)}
                  deletingComment={deletingComment}
                  showDeleteConfirm={showDeleteConfirm}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  cancelReply={cancelReply}
                  onDeletePhoto={handleDeletePhotoClick}
                  showDeletePhotoConfirm={showDeletePhotoConfirm}
                  onConfirmDeletePhoto={confirmDeletePhoto}
                  onCancelDeletePhoto={cancelDeletePhoto}
                  deletingPhoto={deletingPhoto}
                  onEditPhoto={handleEditPhotoClick}
                />
              )}
            </AnimatePresence>
    
            {/* Edit Photo Modal */}
            <AnimatePresence>
              {showEditPhotoModal && (
                <EditPhotoModal
                  photoId={showEditPhotoModal}
                  photo={photos.find(p => p.id === showEditPhotoModal)}
                  formData={editFormData}
                  onFormChange={handleEditFormChange}
                  onSave={() => confirmEditPhoto(showEditPhotoModal)}
                  onCancel={cancelEditPhoto}
                  isEditing={editingPhoto === showEditPhotoModal}
                />
              )}
            </AnimatePresence>
    
            {/* Followers Modal */}
            <AnimatePresence>
              {showFollowersModal && (
                <FollowModal
                  title="Followers"
                  users={followers}
                  onClose={() => setShowFollowersModal(false)}
                  onFollow={handleFollowInModal}
                  onRemove={handleRemoveFollower}
                  isOwner={true}
                  loading={loadingFollowers}
                  hasMore={followersHasMore}
                  onLoadMore={() => loadFollowers(followersPage + 1)}
                  removingUser={removingUser}
                  followActionLoading={followActionLoading}
                />
              )}
            </AnimatePresence>
    
            {/* Following Modal */}
            <AnimatePresence>
              {showFollowingModal && (
                <FollowModal
                  title="Following"
                  users={following}
                  onClose={() => setShowFollowingModal(false)}
                  onFollow={handleUnfollow}
                  isOwner={true}
                  loading={loadingFollowing}
                  hasMore={followingHasMore}
                  onLoadMore={() => loadFollowing(followingPage + 1)}
                  removingUser={null}
                  followActionLoading={followActionLoading}
                  isFollowingList={true}
                />
              )}
            </AnimatePresence>
          </div>
      )
    }
    
    // Tab Button Component
    const TabButton = ({ 
      icon: Icon, 
      label, 
      isActive, 
      onClick 
    }: { 
      icon: any, 
      label: string, 
      isActive: boolean, 
      onClick: () => void 
    }) => (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all ${
          isActive
            ? 'bg-blue-500 text-white shadow-md'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{label}</span>
      </button>
    )
    
    // Empty State Component
    const EmptyState = ({ 
      icon: Icon, 
      title, 
      description, 
      actionLabel, 
      actionHref 
    }: { 
      icon: any, 
      title: string, 
      description: string, 
      actionLabel?: string, 
      actionHref?: string 
    }) => (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Icon className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
        {actionLabel && actionHref && (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            <Camera className="w-5 h-5" />
            {actionLabel}
          </Link>
        )}
      </div>
    )
    
    // Updated Photo Grid Component with Edit Button
    const PhotoGrid = ({ 
      photos, 
      onPhotoClick, 
      onEditClick, 
      currentUserId 
    }: { 
      photos: Photo[], 
      onPhotoClick: (photo: Photo) => void,
      onEditClick: (photoId: string) => void,
      currentUserId: string
    }) => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {photos.map((photo) => (
          <motion.div
            key={photo.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ y: -4 }}
            className="group cursor-pointer relative"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="aspect-square overflow-hidden bg-gray-100 relative">
                <img
                  src={photo.url}
                  alt={photo.title || 'Photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onClick={() => onPhotoClick(photo)}
                />
                
                {/* Edit Button Overlay */}
                {photo.userId === currentUserId && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditClick(photo.id)
                      }}
                      className="p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors backdrop-blur-sm"
                      title="Edit photo"
                    >
                      <Edit className="w-4 h-4 text-white" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-4" onClick={() => onPhotoClick(photo)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Heart className={`w-4 h-4 ${photo.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                      <span>{photo.likeCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{photo.commentCount}</span>
                    </div>
                  </div>
                  {photo.location && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-24">{photo.location}</span>
                    </div>
                  )}
                </div>
                {photo.title && (
                  <h3 className="font-medium text-gray-900 mt-2 line-clamp-2">{photo.title}</h3>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    )
    
    // Edit Photo Modal Component
    const EditPhotoModal = ({
      photoId,
      photo,
      formData,
      onFormChange,
      onSave,
      onCancel,
      isEditing
    }: {
      photoId: string
      photo?: Photo
      formData: { title: string; description: string; location: string }
      onFormChange: (field: string, value: string) => void
      onSave: () => void
      onCancel: () => void
      isEditing: boolean
    }) => (
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      >
        
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-white rounded-2xl lg:w-full lg:max-w-md lg:mx-4 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Edit Photo</h3>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
    
          {/* Form */}
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => onFormChange('title', e.target.value)}
                placeholder="Add a title..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>
    
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => onFormChange('description', e.target.value)}
                placeholder="Tell your story..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/500 characters</p>
            </div>
    
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={(e) => onFormChange('location', e.target.value)}
                  placeholder="Where was this taken?"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={100}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{formData.location.length}/100 characters</p>
            </div>
          </div>
    
          {/* Actions */}
          <div className="p-6 border-t border-gray-200 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isEditing}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={isEditing}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              {isEditing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save
                </>
              )}
            </button>
          </div>
          
        </motion.div>
        </motion.div>
      
    )
    
    // Updated Photo Modal Component with Edit functionality
    const PhotoModal = ({
      photo,
      comments,
      newComment,
      setNewComment,
      onClose,
      onLike,
      onComment,
      isCommenting,
      currentUser,
      replyingTo,
      setReplyingTo,
      replyText,
      setReplyText,
      onReply,
      isReplying,
      onDeleteComment,
      canDeleteComment,
      deletingComment,
      showDeleteConfirm,
      setShowDeleteConfirm,
      cancelReply,
      onDeletePhoto,
      showDeletePhotoConfirm,
      onConfirmDeletePhoto,
      onCancelDeletePhoto,
      deletingPhoto,
      onEditPhoto
    }: {
      photo: Photo
      comments: Comment[]
      newComment: string
      setNewComment: (value: string) => void
      onClose: () => void
      onLike: () => void
      onComment: (e: React.FormEvent) => void
      isCommenting: boolean
      currentUser: any
      replyingTo: string | null
      setReplyingTo: (id: string) => void
      replyText: string
      setReplyText: (text: string) => void
      onReply: (e: React.FormEvent, commentId: string) => void
      isReplying: boolean
      onDeleteComment: (commentId: string) => void
      canDeleteComment: (comment: Comment) => boolean
      deletingComment: string | null
      showDeleteConfirm: string | null
      setShowDeleteConfirm: (id: string | null) => void
      cancelReply: () => void
      onDeletePhoto: (photoId: string) => void
      showDeletePhotoConfirm: string | null
      onConfirmDeletePhoto: (photoId: string) => void
      onCancelDeletePhoto: () => void
      deletingPhoto: string | null
      onEditPhoto: (photoId: string) => void
    }) => (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-white rounded-2xl overflow-hidden max-w-6xl w-full max-h-[95vh] flex flex-col lg:flex-row shadow-2xl m-4 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Image Section */}
          <div className="flex-1 max-sm:hidden bg-black flex items-center justify-center min-h-[300px] lg:min-h-[600px]">
            <img
              src={photo.url}
              alt={photo.title || 'Photo'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
    
          {/* Comments Section */}
          <div className="w-full lg:w-96 flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                {photo.title && (
                  <h3 className="font-semibold text-gray-900 truncate">{photo.title}</h3>
                )}
                {photo.description && (
                  <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                    {photo.description}
                  </p>
                )}
                {photo.location && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{photo.location}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                {/* Only show edit and delete buttons if user owns the photo */}
                {currentUser?.id === photo.userId && (
                  <>
                    <button
                      onClick={() => onEditPhoto(photo.id)}
                      className="p-2 hover:bg-blue-50 rounded-full transition-colors text-blue-500 hover:text-blue-700"
                      title="Edit photo"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeletePhoto(photo.id)}
                      disabled={deletingPhoto === photo.id}
                      className="p-2 hover:bg-red-50 rounded-full transition-colors text-red-500 hover:text-red-700"
                      title="Delete photo"
                    >
                      {deletingPhoto === photo.id ? (
                        <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
    
            {/* Actions */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-4">
                <button
                  onClick={onLike}
                  className="flex items-center gap-2 hover:text-red-500 transition-colors"
                >
                  <Heart className={`w-6 h-6 ${photo.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span className="font-medium">{photo.likeCount}</span>
                </button>
                <div className="flex items-center gap-2 text-gray-600">
                  <MessageCircle className="w-6 h-6" />
                  <span className="font-medium">{photo.commentCount}</span>
                </div>
              </div>
            </div>
    
            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  <div className="flex gap-3">
                    <div className="">
                      {comment.user.avatar ? (
                        <img
                          src={comment.user.avatar}
                            alt={comment.user.name || comment.user.username}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                          {comment.user.name?.[0] || comment.user.username?.[0] || '?'}
                          </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.user.name || comment.user.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm break-words">{comment.text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-xs text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          Reply
                        </button>
                        {canDeleteComment(comment) && (
                          <button
                            onClick={() => setShowDeleteConfirm(comment.id)}
                            disabled={deletingComment === comment.id}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors"
                          >
                            {deletingComment === comment.id ? (
                              <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              'Delete'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
    
                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 space-y-2">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white text-xs font-medium">
                            {reply.user.avatar ? (
                              <img
                                src={reply.user.avatar}
                                alt={reply.user.name || reply.user.username}
                                className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                              reply.user.name?.[0] || reply.user.username?.[0] || '?'
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-sm">
                                {reply.user.name || reply.user.username}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(reply.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm break-words">{reply.text}</p>
                            {canDeleteComment(reply) && (
                              <button
                                onClick={() => setShowDeleteConfirm(reply.id)}
                                disabled={deletingComment === reply.id}
                                className="text-xs text-red-500 hover:text-red-700 transition-colors mt-1"
                              >
                                {deletingComment === reply.id ? (
                                  <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  'Delete'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
    
                  {/* Reply Input */}
                  {replyingTo === comment.id && (
                    <div className="ml-11">
                      <form
                        onSubmit={(e) => onReply(e, comment.id)}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={!replyText.trim() || isReplying}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {isReplying ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={cancelReply}
                          className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                        >
                          Cancel
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
    
            {/* Comment Input */}
            <div className="p-4 border-t border-gray-200">
              <form onSubmit={onComment} className="flex gap-3">
                
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isCommenting}
                    className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCommenting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </form>
            </div>
    
            {/* Photo Delete Confirmation Modal */}
            <AnimatePresence>
              {showDeletePhotoConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10"
                  onClick={onCancelDeletePhoto}
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-600" />
                      </div>
                      <h4 className="text-xl font-semibold text-gray-900 mb-2">Delete Photo</h4>
                      <p className="text-gray-600 text-sm">
                        Are you sure you want to delete this photo? This action cannot be undone and will also delete all comments and likes.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={onCancelDeletePhoto}
                        disabled={deletingPhoto === showDeletePhotoConfirm}
                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onConfirmDeletePhoto(showDeletePhotoConfirm)}
                        disabled={deletingPhoto === showDeletePhotoConfirm}
                        className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                      >
                        {deletingPhoto === showDeletePhotoConfirm ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
    
            {/* Comment Delete Confirmation Modal */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center p-4"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    className="bg-white rounded-2xl p-6 max-w-sm w-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className="font-semibold text-gray-900 mb-2">Delete Comment</h4>
                    <p className="text-gray-600 text-sm mb-4">
                      Are you sure you want to delete this comment? This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => onDeleteComment(showDeleteConfirm)}
                        disabled={deletingComment === showDeleteConfirm}
                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deletingComment === showDeleteConfirm ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : (
                          'Delete'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    )
    
    // Follow Modal Component (same as before)
    const FollowModal = ({
      title,
      users,
      onClose,
      onFollow,
      onRemove,
      isOwner,
      loading,
      hasMore,
      onLoadMore,
      removingUser,
      followActionLoading,
      isFollowingList = false
    }: {
      title: string
      users: FollowUser[]
      onClose: () => void
      onFollow: (userId: string, currentlyFollowing: boolean) => void
      onRemove?: (userId: string) => void
      isOwner: boolean
      loading: boolean
      hasMore: boolean
      onLoadMore: () => void
      removingUser: string | null
      followActionLoading: string | null
      isFollowingList?: boolean
    }) => (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 50 }}
          className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col m-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
    
          {/* Users List */}
          <div className="flex-1 overflow-y-auto">
            {users.length === 0 && !loading ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No {title.toLowerCase()} yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-medium">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name?.[0] || user.username?.[0] || '?'
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-600">@{user.username}</p>
                        {user.bio && (
                          <p className="text-xs text-gray-500 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                    </div>
    
                    <div className="flex items-center gap-2">
                      {isOwner && !isFollowingList && onRemove && (
                        <button
                          onClick={() => onRemove(user.id)}
                          disabled={removingUser === user.id}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Remove follower"
                        >
                          {removingUser === user.id ? (
                            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <UserMinus className="w-4 h-4" />
                          )}
                        </button>
                      )}
    
                      {isFollowingList ? (
                        <button
                          onClick={() => onFollow(user.id, true)}
                          disabled={followActionLoading === user.id}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                          {followActionLoading === user.id ? (
                            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            'Unfollow'
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => onFollow(user.id, user.isFollowing)}
                          disabled={followActionLoading === user.id}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            user.isFollowing
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {followActionLoading === user.id ? (
                            <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                              user.isFollowing ? 'border-gray-600' : 'border-white'
                            }`} />
                          ) : (
                            user.isFollowing ? 'Unfollow' : 'Follow'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
    
                {loading && (
                  <div className="flex justify-center py-4">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
    
                {hasMore && !loading && (
                  <button
                    onClick={onLoadMore}
                    className="w-full py-2 text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    Load More
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    )