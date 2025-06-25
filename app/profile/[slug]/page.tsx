"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  MapPin,
  Calendar,
  Edit3,
  Users,
  Heart,
  Share2,
  Settings,
  Grid,
  Bookmark,
  X,
  MessageCircle,
  Send,
  Reply,
  Trash2,
  UserPlus,
  UserMinus,
  Edit,
  MoreVertical,
  Check,
  Loader2,
  Save,
  ImageIcon,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { usePhotoInteractions } from "../../../hooks/usePhotoInteractions";
import { usePhotosState } from "../../../hooks/usePhotosState";
import { useModalState } from "../../../hooks/useModalState";
import { useFollow } from "../../../hooks/useFollow";

interface UserStats {
  photos: number;
  likes: number;
  followers: number;
  following: number;
  isFollowing?: boolean;
}

interface Photo {
  id: string;
  url: string;
  title?: string;
  description?: string;
  location?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  userId: string;
  user: any;
}

interface User {
  id: string;
  createdAt: string;
  name: string;
  username: string;
  bio: string;
  isPrivate: boolean;
  avatar?: string;
  email?: string;
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

export default function Page() {
  const { user: clerkUser } = useUser();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({
    photos: 0,
    likes: 0,
    followers: 0,
    following: 0,
    isFollowing: false,
  });
  const [activeTab, setActiveTab] = useState<"photos" | "saved">("photos");
  const [loading, setLoading] = useState(true);
  const [userNotFound, setUserNotFound] = useState(false);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);

  // Photo deletion states
  const [showDeletePhotoConfirm, setShowDeletePhotoConfirm] = useState<
    string | null
  >(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);

  // Photo editing states
  const [showEditPhotoModal, setShowEditPhotoModal] = useState<string | null>(
    null
  );
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    location: "",
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

  const isOwnProfile = clerkUser?.id === profileUser?.id;

  // Use our custom hooks
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

  const {
    toggleFollow,
    getFollowers,
    getFollowing,
    loading: followLoading,
  } = useFollow();

  useEffect(() => {
    if (slug && clerkUser) {
      // Check if visiting own profile - redirect to main profile page
      if (slug === clerkUser.id) {
        router.replace("/profile");
        return;
      }
      fetchUserData();
    }
  }, [slug, clerkUser, router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setUserNotFound(false);

      // Fetch user profile
      const userResponse = await fetch(`/api/getuserbyid?id=${slug}`);
      if (!userResponse.ok) {
        setUserNotFound(true);
        return;
      }
      const userData = await userResponse.json();

      setProfileUser(userData.user);

      // Fetch user stats (including follow status)
      const statsResponse = await fetch(
        `/api/stats?userId=${userData.user.id}`
      );
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch user photos with like status
      const photosResponse = await fetch(
        `/api/photos?userId=${userData.user.id}`
      );
      if (photosResponse.ok) {
        const photosData = await photosResponse.json();
        setPhotosData(photosData.photos);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUserNotFound(true);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profileUser) return;

    const result = await toggleFollow(
      profileUser.id,
      stats.isFollowing || false
    );
    if (result?.success) {
      setStats((prev) => ({
        ...prev,
        isFollowing: result.isFollowing,
        followers: result.isFollowing ? prev.followers + 1 : prev.followers - 1,
      }));
    }
  };

  const loadFollowers = async (page = 1, reset = false) => {
    if (!profileUser || loadingFollowers) return;

    setLoadingFollowers(true);
    try {
      const data = await getFollowers(profileUser.id, page);
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
    if (!profileUser || loadingFollowing) return;

    setLoadingFollowing(true);
    try {
      const data = await getFollowing(profileUser.id, page);
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

  const handleFollowInModal = async (
    userId: string,
    currentlyFollowing: boolean
  ) => {
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

      // Update profile stats if following/unfollowing the profile user
      if (userId === profileUser?.id) {
        setStats((prev) => ({
          ...prev,
          isFollowing: result.isFollowing,
          followers: result.isFollowing
            ? prev.followers + 1
            : prev.followers - 1,
        }));
      }
    }
  };

  const handlePhotoClick = async (photo: Photo) => {
    // Add user property if it doesn't exist
    const photoWithUser = {
      ...photo,
      user: photo.user || { id: profileUser?.id || "" },
    };
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

    const result = await addReplyAPI(commentId, replyText);
    if (result?.success) {
      addReplyToState(commentId, result.reply);
      updatePhotoCommentCount(selectedPhoto!.id, 1);
      cancelReply();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(commentId);
    const result = await deleteCommentAPI(commentId);
    if (result?.success) {
      removeComment(commentId);
      updatePhotoCommentCount(selectedPhoto!.id, -result.deletedCount);
      setShowDeleteConfirm(null);
    }
    setDeletingComment(null);
  };

  // Photo deletion functions (only for own photos)
  const handleDeletePhotoClick = (photoId: string) => {
    setShowDeletePhotoConfirm(photoId);
  };

  const confirmDeletePhoto = async (photoId: string) => {
    try {
      setDeletingPhoto(photoId);
      const response = await fetch(`/api/photos/${photoId}`, {
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

  // Photo editing functions (only for own photos)
  const handleEditPhotoClick = (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (photo) {
      setEditFormData({
        title: photo.title || "",
        description: photo.description || "",
        location: photo.location || "",
      });
      setShowEditPhotoModal(photoId);
    }
  };

  const handleEditFormChange = (field: string, value: string) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
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
        body: JSON.stringify(editFormData),
      });

      const data = await response.json();

      if (response.ok) {
        // Update photo in state
        setPhotosData(
          photos.map((photo: Photo) =>
            photo.id === photoId
              ? {
                  ...photo,
                  ...editFormData,
                  user: photo.user || { id: photo.userId },
                }
              : photo
          )
        );

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
      title: "",
      description: "",
      location: "",
    });
  };

  const closeModal = () => {
    setSelectedPhotoData(null);
    setNewComment("");
    cancelReply();
    setShowDeleteConfirm(null);
    setShowDeletePhotoConfirm(null);
    setShowEditPhotoModal(null);
  };

  const handleShare = async () => {
    if (!profileUser) return;

    try {
      await navigator.share({
        title: `${profileUser.name || profileUser.username}'s Profile`,
        text: `Check out ${
          profileUser.name || profileUser.username
        }'s photography!`,
        url: window.location.href,
      });
    } catch (error) {
      // Fallback to copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-16 sm:pt-0 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (userNotFound || !profileUser) {
    return (
      <div className="min-h-screen bg-white pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            User not found
          </h1>
          <p className="text-gray-600 mb-6">
            The profile you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              Go Home
            </motion.button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white lg:pt-16 max-sm:pt-16 sm:pt-0">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Profile Header - Instagram style */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-start gap-4 sm:gap-8 mb-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5 sm:p-1">
                  <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                    {profileUser.avatar ? (
                      <img
                        src={profileUser.avatar}
                        alt={profileUser.name || profileUser.username || "User"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl sm:text-3xl font-bold text-gray-600">
                        {profileUser.name?.charAt(0) ||
                          profileUser.username?.charAt(0) ||
                          profileUser.email?.charAt(0) ||
                          "U"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                {/* Username and buttons */}
                <div className="flex items-center gap-3 sm:gap-4 mb-4">
                  <h1 className="text-xl sm:text-2xl font-light text-gray-900">
                    @
                    {profileUser.username ||
                      profileUser.email?.split("@")[0] ||
                      "user"}
                  </h1>

                  {/* Desktop buttons */}
                  <div className="hidden sm:flex items-center gap-2">
                    {isOwnProfile ? (
                      <>
                        <Link href="/settings">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                          >
                            Edit profile
                          </motion.button>
                        </Link>
                        <Link href="/settings">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Settings className="w-5 h-5 text-gray-700" />
                          </motion.button>
                        </Link>
                      </>
                    ) : (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleFollow}
                          disabled={followLoading}
                          className={`px-6 py-1.5 rounded-lg font-medium text-sm transition-all ${
                            stats.isFollowing
                              ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                              : "bg-blue-500 text-white hover:bg-blue-600"
                          } ${
                            followLoading ? "opacity-75 cursor-not-allowed" : ""
                          }`}
                        >
                          {followLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : stats.isFollowing ? (
                            "Following"
                          ) : (
                            "Follow"
                          )}
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleShare}
                          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          title="Share profile"
                        >
                          <Share2 className="w-5 h-5 text-gray-700" />
                        </motion.button>
                      </>
                    )}
                  </div>
                </div>

                {/* Name and bio */}
                <div className="mb-4">
                  {profileUser.name && (
                    <h2 className="font-medium text-gray-900 mb-1">
                      {profileUser.name}
                    </h2>
                  )}
                  {profileUser.bio && (
                    <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {profileUser.bio}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="font-semibold text-gray-900">
                      {stats.photos}
                    </span>
                    <span className="text-gray-700 ml-1">posts</span>
                  </div>
                  <button
                    onClick={handleFollowersClick}
                    className="hover:text-blue-600 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">
                      {stats.followers}
                    </span>
                    <span className="text-gray-700 ml-1">followers</span>
                  </button>
                  <button
                    onClick={handleFollowingClick}
                    className="hover:text-blue-600 transition-colors"
                  >
                    <span className="font-semibold text-gray-900">
                      {stats.following}
                    </span>
                    <span className="text-gray-700 ml-1">following</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile buttons */}
            <div className="sm:hidden flex gap-2">
              {isOwnProfile ? (
                <>
                  <Link href="/settings" className="flex-1">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm"
                    >
                      Edit profile
                    </motion.button>
                  </Link>
                  <Link href="/settings">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Settings className="w-5 h-5 text-gray-700" />
                    </motion.button>
                  </Link>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                      stats.isFollowing
                        ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    } ${followLoading ? "opacity-75 cursor-not-allowed" : ""}`}
                  >
                    {followLoading ? (
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto" />
                    ) : stats.isFollowing ? (
                      "Following"
                    ) : (
                      "Follow"
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleShare}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Share profile"
                  >
                    <Share2 className="w-5 h-5 text-gray-700" />
                  </motion.button>
                </>
              )}
            </div>
          </motion.section>

          {/* Content */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {activeTab === "photos" &&
              (photos.length > 0 ? (
                <PhotoGrid
                  photos={photos}
                  onPhotoClick={handlePhotoClick}
                  onEditClick={handleEditPhotoClick}
                  currentUserId={clerkUser?.id}
                  profileUserId={profileUser.id}
                />
              ) : (
                <EmptyState
                  icon={Camera}
                  title={
                    isOwnProfile
                      ? "No photos yet"
                      : `${
                          profileUser.name || profileUser.username
                        } hasn't posted yet`
                  }
                  description={
                    isOwnProfile
                      ? "Share your first photo to get started!"
                      : "When they share photos, you'll see them here."
                  }
                  actionLabel={isOwnProfile ? "Upload Photo" : undefined}
                  actionHref={isOwnProfile ? "/addphoto" : undefined}
                />
              ))}

            {activeTab === "saved" && (
              <EmptyState
                icon={Bookmark}
                title="No saved photos"
                description="Photos you save will appear here"
              />
            )}
          </motion.section>
        </div>
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
            canDeleteComment={(comment) =>
              canDeleteComment(comment, selectedPhoto.userId)
            }
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
            isOwnProfile={isOwnProfile}
          />
        )}
      </AnimatePresence>

      {/* Edit Photo Modal */}
      <AnimatePresence>
        {showEditPhotoModal && (
          <EditPhotoModal
            photoId={showEditPhotoModal}
            photo={photos.find((p) => p.id === showEditPhotoModal)}
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
            isOwner={isOwnProfile}
            loading={loadingFollowers}
            hasMore={followersHasMore}
            onLoadMore={() => loadFollowers(followersPage + 1)}
            followActionLoading={followLoading}
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
            onFollow={handleFollowInModal}
            isOwner={isOwnProfile}
            loading={loadingFollowing}
            hasMore={followingHasMore}
            onLoadMore={() => loadFollowing(followingPage + 1)}
            followActionLoading={followLoading}
            isFollowingList={true}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Empty State Component
const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) => (
  <div className="text-center py-16">
    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <Icon className="w-10 h-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
    {actionLabel && actionHref && (
      <Link href={actionHref}>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        >
          <Camera className="w-5 h-5" />
          {actionLabel}
        </motion.button>
      </Link>
    )}
  </div>
);

// Updated Photo Grid Component with Edit Button
const PhotoGrid = ({
  photos,
  onPhotoClick,
  onEditClick,
  currentUserId,
  profileUserId,
}: {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onEditClick: (photoId: string) => void;
  currentUserId?: string;
  profileUserId: string;
}) => (
  <div className="grid grid-cols-3 gap-1 sm:gap-4">
    {photos.map((photo) => (
      <motion.div
        key={photo.id}
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        className="group cursor-pointer relative aspect-square"
      >
        <div className="w-full h-full bg-gray-100 rounded-lg sm:rounded-xl overflow-hidden">
          <img
            src={photo.url}
            alt={photo.title || "Photo"}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onClick={() => onPhotoClick(photo)}
          />

          {/* Overlay with stats */}
          <div
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
            onClick={() => onPhotoClick(photo)}
          >
            <div className="flex items-center gap-4 text-white text-sm font-medium">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4 fill-current" />
                <span>{photo.likeCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>{photo.commentCount}</span>
              </div>
            </div>
          </div>

          {/* Edit Button Overlay - Only show for own photos */}
          {currentUserId === profileUserId &&
            currentUserId === photo.userId && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditClick(photo.id);
                  }}
                  className="p-2 bg-black/70 hover:bg-black/90 rounded-full transition-colors backdrop-blur-sm"
                  title="Edit photo"
                >
                  <Edit className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
        </div>
      </motion.div>
    ))}
  </div>
);

// Edit Photo Modal Component
const EditPhotoModal = ({
  photoId,
  photo,
  formData,
  onFormChange,
  onSave,
  onCancel,
  isEditing,
}: {
  photoId: string;
  photo?: Photo;
  formData: { title: string; description: string; location: string };
  onFormChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
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
      className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-hidden"
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

      {/* Photo Preview */}
      {photo && (
        <div className="p-6 border-b border-gray-200">
          <div className="aspect-square w-full max-w-48 mx-auto rounded-lg overflow-hidden bg-gray-100">
            <img
              src={photo.url}
              alt={photo.title || "Photo"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Form */}
      <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => onFormChange("title", e.target.value)}
            placeholder="Add a title..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={100}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length}/100 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormChange("description", e.target.value)}
            placeholder="Tell your story..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.description.length}/500 characters
          </p>
        </div>

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="location"
              value={formData.location}
              onChange={(e) => onFormChange("location", e.target.value)}
              placeholder="Where was this taken?"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={100}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.location.length}/100 characters
          </p>
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
          className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
        >
          {isEditing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </motion.div>
  </motion.div>
);

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
  onEditPhoto,
  isOwnProfile,
}: {
  photo: Photo;
  comments: Comment[];
  newComment: string;
  setNewComment: (value: string) => void;
  onClose: () => void;
  onLike: () => void;
  onComment: (e: React.FormEvent) => void;
  isCommenting: boolean;
  currentUser: any;
  replyingTo: string | null;
  setReplyingTo: (id: string) => void;
  replyText: string;
  setReplyText: (text: string) => void;
  onReply: (e: React.FormEvent, commentId: string) => void;
  isReplying: boolean;
  onDeleteComment: (commentId: string) => void;
  canDeleteComment: (comment: Comment) => boolean;
  deletingComment: string | null;
  showDeleteConfirm: string | null;
  setShowDeleteConfirm: (id: string | null) => void;
  cancelReply: () => void;
  onDeletePhoto: (photoId: string) => void;
  showDeletePhotoConfirm: string | null;
  onConfirmDeletePhoto: (photoId: string) => void;
  onCancelDeletePhoto: () => void;
  deletingPhoto: string | null;
  onEditPhoto: (photoId: string) => void;
  isOwnProfile?: boolean;
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
          alt={photo.title || "Photo"}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* Comments Section */}
      <div className="w-full lg:w-96 flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {photo.title && (
              <h3 className="font-semibold text-gray-900 truncate">
                {photo.title}
              </h3>
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
              <Heart
                className={`w-6 h-6 ${
                  photo.isLiked ? "fill-red-500 text-red-500" : ""
                }`}
              />
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-medium">
                  {comment.user.name?.[0] || comment.user.username?.[0] || "?"}
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
                  <p className="text-gray-700 text-sm break-words">
                    {comment.text}
                  </p>
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
                          "Delete"
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
                        {reply.user.name?.[0] ||
                          reply.user.username?.[0] ||
                          "?"}
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
                        <p className="text-gray-700 text-sm break-words">
                          {reply.text}
                        </p>
                        {canDeleteComment(reply) && (
                          <button
                            onClick={() => setShowDeleteConfirm(reply.id)}
                            disabled={deletingComment === reply.id}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors mt-1"
                          >
                            {deletingComment === reply.id ? (
                              <div className="w-3 h-3 border border-red-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              "Delete"
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
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-medium">
              {currentUser?.firstName?.[0] || currentUser?.username?.[0] || "?"}
            </div>
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
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">
                    Delete Photo
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Are you sure you want to delete this photo? This action
                    cannot be undone and will also delete all comments and
                    likes.
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
                <h4 className="font-semibold text-gray-900 mb-2">
                  Delete Comment
                </h4>
                <p className="text-gray-600 text-sm mb-4">
                  Are you sure you want to delete this comment? This action
                  cannot be undone.
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
                      "Delete"
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
);

// Follow Modal Component
const FollowModal = ({
  title,
  users,
  onClose,
  onFollow,
  isOwner,
  loading,
  hasMore,
  onLoadMore,
  followActionLoading,
  isFollowingList = false,
}: {
  title: string;
  users: FollowUser[];
  onClose: () => void;
  onFollow: (userId: string, currentlyFollowing: boolean) => void;
  isOwner: boolean;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  followActionLoading: any;
  isFollowingList?: boolean;
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
                      user.name?.[0] || user.username?.[0] || "?"
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">@{user.username}</p>
                    {user.bio && (
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {user.bio}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onFollow(user.id, user.isFollowing)}
                  disabled={followActionLoading === user.id}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    user.isFollowing
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-blue-500 text-white hover:bg-blue-600"
                  }`}
                >
                  {followActionLoading === user.id ? (
                    <div
                      className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                        user.isFollowing ? "border-gray-600" : "border-white"
                      }`}
                    />
                  ) : user.isFollowing ? (
                    "Unfollow"
                  ) : (
                    "Follow"
                  )}
                </button>
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
);
