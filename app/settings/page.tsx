'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    User, 
    Mail, 
    MapPin, 
    Edit3, 
    Camera, 
    Save, 
    X, 
    Lock, 
    Globe, 
    Bell, 
    Shield, 
    AlertCircle,
    Check,
    Eye,
    EyeOff,
    ChevronDown,
    ChevronUp,
    ArrowLeft
} from 'lucide-react'
import { SignedIn, UserButton, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface UserProfile {
    fullName: string
    username: string
    email: string
    bio: string
    location: string
    isPrivate: boolean
    avatar?: string
}

export default function SettingsPage() {
    const { user: clerkUser, isLoaded } = useUser()
    const router = useRouter()
    
    const [activeTab, setActiveTab] = useState<string | null>('profile')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [profileData, setProfileData] = useState<UserProfile>({
        fullName: '',
        username: '',
        email: '',
        bio: '',
        location: '',
        isPrivate: false,
        avatar: ''
    })
    const [originalData, setOriginalData] = useState<UserProfile>({
        fullName: '',
        username: '',
        email: '',
        bio: '',
        location: '',
        isPrivate: false,
        avatar: ''
    })
    const [hasChanges, setHasChanges] = useState(false)
    const [usernameError, setUsernameError] = useState('')
    const [checkingUsername, setCheckingUsername] = useState(false)

    useEffect(() => {
        if (isLoaded && clerkUser) {
            loadUserData()
        }
    }, [isLoaded, clerkUser])

    useEffect(() => {
        const isChanged = JSON.stringify(profileData) !== JSON.stringify(originalData)
        setHasChanges(isChanged)
    }, [profileData, originalData])

    const loadUserData = async () => {
        try {
            setLoading(true)
            
            // Get user data from Clerk first
            const clerkData = {
                fullName: clerkUser?.fullName || '',
                username: clerkUser?.username || '',
                email: clerkUser?.emailAddresses[0]?.emailAddress || '',
                bio: '',
                location: '',
                isPrivate: false,
                avatar: clerkUser?.imageUrl || ''
            }

            // Then fetch additional data from your database
            try {
                const response = await fetch(`/api/userprofile?userId=${clerkUser?.id}`)
                if (response.ok) {
                    const dbData = await response.json()
                    console.log('Database user data:', dbData)
                    
                    // Merge Clerk data with database data, giving priority to database values
                    const userData = {
                        fullName: dbData.name || clerkData.fullName,
                        username: dbData.username || clerkData.username,
                        email: dbData.email || clerkData.email,
                        bio: dbData.bio || '',
                        location: dbData.location || '',
                        isPrivate: dbData.isPrivate || false,
                        avatar: clerkData.avatar
                    }
                    
                    setProfileData(userData)
                    setOriginalData(userData)
                } else {
                    // If no database record exists, use Clerk data
                    setProfileData(clerkData)
                    setOriginalData(clerkData)
                }
            } catch (error) {
                console.log('No additional user data found, using Clerk data')
                setProfileData(clerkData)
                setOriginalData(clerkData)
            }
        } catch (error) {
            console.error('Error loading user data:', error)
            toast.error('Failed to load profile data')
        } finally {
            setLoading(false)
        }
    }

    const checkUsernameAvailability = async (username: string) => {
        if (username === originalData.username) {
            setUsernameError('')
            return
        }

        if (username.length < 3) {
            setUsernameError('Username must be at least 3 characters')
            return
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameError('Username can only contain letters, numbers, and underscores')
            return
        }

        setCheckingUsername(true)
        try {
            const response = await fetch(`/api/checkusername?username=${username}`)
            const data = await response.json()
            
            if (!data.available) {
                setUsernameError('Username is not available')
            } else {
                setUsernameError('')
            }
        } catch (error) {
            console.error('Error checking username:', error)
            setUsernameError('Error checking username')
        } finally {
            setCheckingUsername(false)
        }
    }

    const handleInputChange = (field: keyof UserProfile, value: string | boolean) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }))

        if (field === 'username' && typeof value === 'string') {
            // Clear previous error immediately
            setUsernameError('')
            
            // Debounce the username check
            const debounceTimer = setTimeout(() => {
                checkUsernameAvailability(value)
            }, 500)
            
            // Store the timer to clear it if user types again
            return () => clearTimeout(debounceTimer)
        }
    }

    const handleSave = async () => {
        if (usernameError) {
            toast.error('Please fix the username error before saving')
            return
        }

        setSaving(true)
        try {
            // Update database with ALL profile data
            const response = await fetch('/api/userprofile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: profileData.fullName,
                    username: profileData.username,
                    email: profileData.email,
                    bio: profileData.bio,
                    location: profileData.location,
                    isPrivate: profileData.isPrivate
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update profile')
            }

            // Update the original data to reflect the saved state
            setOriginalData(profileData)
            toast.success('Profile updated successfully!')
            
        } catch (error) {
            console.error('Error saving profile:', error)
            toast.error(error instanceof Error ? error.message : 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }

    const handleDiscard = () => {
        setProfileData(originalData)
        setUsernameError('')
    }

    const toggleAccordion = (tabId: string) => {
        setActiveTab(activeTab === tabId ? null : tabId)
    }

    const tabs = [
        { id: 'profile', label: 'Edit Profile', icon: User },
        { id: 'privacy', label: 'Privacy and Security', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'help', label: 'Help', icon: Shield }
    ]

    if (!isLoaded || loading) {
        return (
            <div className="min-h-screen bg-white pt-16 flex items-center justify-center px-4">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        )
    }

    if (!clerkUser) {
        return (
            <div className="min-h-screen bg-white pt-16 flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-gray-600">Please sign in to access settings</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white fixed top-0 left-0 right-0 z-50">
                <div className="max-w-md mx-auto px-3 sm:px-4 py-3">
                    <div className="flex items-center justify-between">
                        <Link href="/profile">
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" />
                        </Link>
                        <h1 className="text-base sm:text-lg font-semibold text-gray-900">Settings</h1>
                        <div className="w-5 h-5 sm:w-6 sm:h-6"></div>
                    </div>
                </div>
            </div>

            <div className="pt-16 pb-20 max-w-md mx-auto min-h-screen px-4">
                {/* Accordion Settings Menu */}
                <div className="space-y-2 mt-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        
                        return (
                            <div key={tab.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Accordion Header */}
                                <button
                                    onClick={() => toggleAccordion(tab.id)}
                                    className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-gray-700" />
                                        <span className="text-base text-gray-900 font-medium">{tab.label}</span>
                                    </div>
                                    {isActive ? (
                                        <ChevronUp className="w-5 h-5 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    )}
                                </button>

                                {/* Accordion Content */}
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                            className="border-t border-gray-200"
                                        >
                                            {tab.id === 'profile' && (
                                                <div className="p-4">
                                                    {/* Avatar Section */}
                                                    <div className="mb-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                                                                <SignedIn>
                                                                    <UserButton 
                                                                        appearance={{
                                                                            elements: {
                                                                                userButtonBox: "w-16 h-16",
                                                                                userButtonTrigger: "w-16 h-16",
                                                                                avatarImage: "w-16 h-16"
                                                                            }
                                                                        }}
                                                                    />
                                                                </SignedIn>
                                                            </div>
                                                                <p className="text-sm text-gray-500 truncate">click on profile to manage account</p>
                                                            
                                                        </div>
                                                    </div>

                                                    {/* Form Fields */}
                                                    <div className="space-y-4">
                                                        {/* Full Name */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                                                            <input
                                                                type="text"
                                                                value={profileData.fullName}
                                                                onChange={(e) => handleInputChange('fullName', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="Enter your name"
                                                            />
                                                        </div>

                                                        {/* Username */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={profileData.username}
                                                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 ${
                                                                        usernameError ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                                                                    }`}
                                                                    placeholder="username"
                                                                />
                                                                {checkingUsername && (
                                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                                                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {usernameError && (
                                                                <p className="mt-1 text-sm text-red-600">{usernameError}</p>
                                                            )}
                                                        </div>

                                                        {/* Bio */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                                                            <textarea
                                                                value={profileData.bio}
                                                                onChange={(e) => handleInputChange('bio', e.target.value)}
                                                                rows={3}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                                                placeholder="Tell us about yourself..."
                                                                maxLength={160}
                                                            />
                                                            <p className="text-sm text-gray-400 mt-1">{profileData.bio.length}/160</p>
                                                        </div>

                                                        {/* Location */}
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                                                            <input
                                                                type="text"
                                                                value={profileData.location}
                                                                onChange={(e) => handleInputChange('location', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                placeholder="Where are you located?"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Save Button */}
                                                    {hasChanges && (
                                                        <div className="mt-6 pt-4 border-t border-gray-200">
                                                            <button
                                                                onClick={handleSave}
                                                                disabled={saving || !!usernameError}
                                                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
                                                            >
                                                                {saving ? 'Saving...' : 'Save Changes'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {tab.id === 'privacy' && (
                                                <div className="p-4">
                                                    {/* Account Privacy */}
                                                    <div className="mb-6">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <h3 className="text-base font-medium text-gray-900 mb-1">Private Account</h3>
                                                                <p className="text-sm text-gray-500">
                                                                    When your account is private, only people you approve can see your photos
                                                                </p>
                                                            </div>
                                                            <div className="flex-shrink-0 pt-1">
                                                                <label className="relative inline-flex items-center cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={profileData.isPrivate}
                                                                        onChange={(e) => handleInputChange('isPrivate', e.target.checked)}
                                                                        className="sr-only peer"
                                                                    />
                                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Save Button */}
                                                    {hasChanges && (
                                                        <div className="pt-4 border-t border-gray-200">
                                                            <button
                                                                onClick={handleSave}
                                                                disabled={saving}
                                                                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors"
                                                            >
                                                                {saving ? 'Saving...' : 'Save Changes'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {(tab.id === 'notifications' || tab.id === 'help') && (
                                                <div className="p-4 py-12 text-center">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Icon className="w-8 h-8 text-gray-400" />
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
                                                    <p className="text-gray-500 text-sm">
                                                        This feature is currently under development
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
