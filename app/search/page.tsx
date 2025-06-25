'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Search, 
    Lock, 
    Globe, 
    X, 
    Camera,
    Users,
    Loader2,
    ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

interface UserData {
    id: string
    createdAt: string
    updatedAt: string
    name: string
    username: string
    email: string
    bio: string | null
    avatar: string
    isPrivate: boolean
    stats?: {
        photos: number
        followers: number
        following: number
        likes: number
    }
    isFollowing?: boolean
    followedByViewer?: boolean
}

interface SearchHistory {
    id: string
    name: string
    username: string
    avatar: string
    searchedAt: string
}

export default function SearchPage() {
    const { user } = useUser()
    const [searchQuery, setSearchQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [searchResults, setSearchResults] = useState<UserData[]>([])
    const [recentSearches, setRecentSearches] = useState<SearchHistory[]>([])
    const [error, setError] = useState<string | null>(null)
    const [showResults, setShowResults] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('recentSearches')
        if (saved) {
            setRecentSearches(JSON.parse(saved))
        }
    }, [])

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault()
        }
        
        if (!searchQuery.trim()) {
            toast.error('Please enter a search term')
            return
        }

        setIsLoading(true)
        setError(null)
        setHasSearched(true)
        
        try {
            const response = await fetch(`/api/getuser?q=${encodeURIComponent(searchQuery.trim())}`)
            if (response.ok) {
                const data = await response.json()
                setSearchResults(data.users || [])
                setShowResults(true)
            } else {
                setError('No users found')
                setSearchResults([])
                setShowResults(true)
            }
        } catch (error) {
            console.error('Search error:', error)
            setError('Search failed. Please try again.')
            setSearchResults([])
            setShowResults(true)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUserClick = (user: UserData) => {
        // Add to recent searches
        const newSearch: SearchHistory = {
            id: user.id,
            name: user.name,
            username: user.username,
            avatar: user.avatar,
            searchedAt: new Date().toISOString()
        }

        const updated = [newSearch, ...recentSearches.filter(s => s.id !== user.id)].slice(0, 10)
        setRecentSearches(updated)
        localStorage.setItem('recentSearches', JSON.stringify(updated))
    }

    const clearSearch = () => {
        setSearchQuery('')
        setShowResults(false)
        setSearchResults([])
        setError(null)
        setHasSearched(false)
    }

    const clearRecentSearches = () => {
        setRecentSearches([])
        localStorage.removeItem('recentSearches')
    }

    const removeRecentSearch = (id: string) => {
        const updated = recentSearches.filter(search => search.id !== id)
        setRecentSearches(updated)
        localStorage.setItem('recentSearches', JSON.stringify(updated))
    }

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
        return num.toString()
    }

    return (
        <div className="min-h-screen bg-white max-sm:bg-gray-50 pt-16 max-sm:pt-0">
            <div className="max-w-2xl mx-auto px-4 max-sm:px-0 py-8 max-sm:py-0">
                {/* Mobile Header */}
                <div className="hidden max-sm:block bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-900" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">Search</h1>
                    </div>
                </div>

                {/* Desktop Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 max-sm:hidden"
                >
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Search</h1>
                    <p className="text-slate-600">Discover photographers and creators</p>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl max-sm:rounded-none shadow-sm border border-slate-200 max-sm:border-0 max-sm:border-b max-sm:shadow-none p-6 max-sm:p-3 mb-6 max-sm:mb-0 max-sm:sticky max-sm:top-16 max-sm:z-10"
                >
                    <form onSubmit={handleSearch} className="flex gap-3 max-sm:gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 max-sm:left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 max-sm:w-4 max-sm:h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search"
                                className="w-full pl-12 max-sm:pl-10 pr-12 max-sm:pr-10 py-4 max-sm:py-3 border border-slate-300 max-sm:border-gray-200 rounded-xl max-sm:rounded-lg max-sm:bg-gray-100 focus:ring-2 focus:ring-purple-500 max-sm:focus:ring-1 max-sm:focus:ring-gray-300 focus:border-transparent outline-none transition-all duration-200 text-slate-900 max-sm:text-sm placeholder-slate-500 max-sm:placeholder-gray-500"
                                disabled={isLoading}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-4 max-sm:right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                                >
                                    <X className="w-4 h-4 max-sm:w-3 max-sm:h-3 text-slate-400" />
                                </button>
                            )}
                        </div>

                        {/* Desktop Search Button */}
                        <motion.button
                            type="submit"
                            disabled={isLoading || !searchQuery.trim()}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="max-sm:hidden px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 hover:shadow-lg"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    Search
                                </>
                            )}
                        </motion.button>
                        {/* Mobile Search Button */}
                        <button
                            type="submit"
                            disabled={isLoading || !searchQuery.trim()}
                            className="hidden max-sm:flex px-4 py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 items-center gap-2 text-sm"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                </motion.div>

                {/* Content Container */}
                <div className="max-sm:px-0">
                    {/* Search Results */}
                    <AnimatePresence>
                        {showResults && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-2xl max-sm:rounded-none shadow-sm border border-slate-200 max-sm:border-0 overflow-hidden mb-6 max-sm:mb-0"
                            >
                                <div className="p-6 max-sm:p-4 border-b border-slate-200 max-sm:border-gray-100 max-sm:hidden"></div>
                                <div className="p-6 max-sm:p-4 border-b border-slate-200 max-sm:border-gray-100 max-sm:hidden">
                                    <h3 className="font-semibold text-slate-900">
                                        Search Results for "{searchQuery}"
                                    </h3>
                                    {searchResults.length > 0 && (
                                        <p className="text-sm text-slate-500 mt-1">
                                            Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>

                                {error || searchResults.length === 0 ? (
                                    <div className="p-8 max-sm:p-6 text-center">
                                        <div className="w-16 h-16 max-sm:w-12 max-sm:h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users className="w-8 h-8 max-sm:w-6 max-sm:h-6 text-slate-400" />
                                        </div>
                                        <p className="text-slate-600 font-medium mb-2 max-sm:text-sm">No users found</p>
                                        <p className="text-sm max-sm:text-xs text-slate-500">Try searching with different keywords</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-200 max-sm:divide-gray-100">
                                        {searchResults.map((user, index) => (
                                            <motion.div
                                                key={user.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="p-6 max-sm:p-4 hover:bg-slate-50 max-sm:hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <Link
                                                        href={`/profile/${user.id}`}
                                                        onClick={() => handleUserClick(user)}
                                                        className="flex items-center gap-4 max-sm:gap-3 flex-1 min-w-0"
                                                    >
                                                        <div className="relative">
                                                            <div className="w-14 h-14 max-sm:w-12 max-sm:h-12 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-0.5">
                                                                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                                                                    {user.avatar ? (
                                                                        <img 
                                                                            src={user.avatar} 
                                                                            alt={user.name}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-lg max-sm:text-base font-bold text-slate-600">
                                                                            {user.name.charAt(0)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {user.isPrivate && (
                                                                <div className="absolute -top-1 -right-1 w-6 h-6 max-sm:w-5 max-sm:h-5 bg-slate-600 rounded-full flex items-center justify-center">
                                                                    <Lock className="w-3 h-3 max-sm:w-2 max-sm:h-2 text-white" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <div className="flex items-center gap-2 mb-1 max-sm:mb-0">
                                                                                                    <h3 className="font-semibold text-slate-900 max-sm:text-sm truncate">
                                                                                                        {user.name}
                                                                                                    </h3>
                                                                                                    {!user.isPrivate ? (
                                                                                                        <Globe className="w-4 h-4 max-sm:w-3 max-sm:h-3 text-green-500 flex-shrink-0 max-sm:hidden" />
                                                                                                    ) : (
                                                                                                        <Lock className="w-4 h-4 max-sm:w-3 max-sm:h-3 text-slate-500 flex-shrink-0 max-sm:hidden" />
                                                                                                    )}
                                                                                                </div>
                                                                                                <p className="text-sm max-sm:text-xs text-slate-500 truncate mb-2 max-sm:mb-1">
                                                                                                    @{user.username}
                                                                                                </p>
                                                                                                {user.stats && (
                                                                                                    <div className="flex items-center gap-4 max-sm:gap-3 text-xs max-sm:text-xs text-slate-500 max-sm:hidden">
                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <Camera className="w-3 h-3" />
                                                                                                            <span>{formatNumber(user.stats.photos)} photos</span>
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-1">
                                                                                                            <Users className="w-3 h-3" />
                                                                                                            <span>{formatNumber(user.stats.followers)} followers</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </Link>
                                                                                    </div>
                                                                                </motion.div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>

                    {/* Recent Searches */}
                    {!showResults && recentSearches.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl max-sm:rounded-none shadow-sm border border-slate-200 max-sm:border-0 overflow-hidden max-sm:px-4"
                        >
                            <div className="p-6 max-sm:p-4 border-b border-slate-200 max-sm:border-gray-100 flex items-center justify-between">
                                <h3 className="font-semibold text-slate-900 max-sm:text-base">Recent</h3>
                                <button
                                    onClick={clearRecentSearches}
                                    className="text-sm text-purple-600 max-sm:text-blue-500 hover:text-purple-700 max-sm:hover:text-blue-600 font-medium"
                                >
                                    Clear all
                                </button>
                            </div>

                            <div className="divide-y divide-slate-200 max-sm:divide-gray-100">
                                {recentSearches.map((search, index) => (
                                    <motion.div
                                        key={search.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-4 max-sm:p-3 hover:bg-slate-50 max-sm:hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <Link
                                                href={`/profile/${search.id}`}
                                                className="flex items-center gap-3 max-sm:gap-3 flex-1 min-w-0"
                                            >
                                                <div className="w-10 h-10 max-sm:w-8 max-sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 p-0.5">
                                                    <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                                                        {search.avatar ? (
                                                            <img 
                                                                src={search.avatar} 
                                                                alt={search.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="text-sm max-sm:text-xs font-bold text-slate-600">
                                                                {search.name.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 max-sm:text-sm truncate">
                                                        {search.name}
                                                    </p>
                                                    <p className="text-sm max-sm:text-xs text-slate-500 truncate">
                                                        @{search.username}
                                                    </p>
                                                </div>
                                            </Link>

                                            <button
                                                onClick={() => removeRecentSearch(search.id)}
                                                className="p-1 hover:bg-slate-200 max-sm:hover:bg-gray-200 rounded-full transition-colors"
                                            >
                                                <X className="w-4 h-4 max-sm:w-3 max-sm:h-3 text-slate-400" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Empty State */}
                    {!showResults && recentSearches.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-2xl max-sm:rounded-none shadow-sm border border-slate-200 max-sm:border-0 p-12 max-sm:p-8 text-center"
                        >
                            <div className="w-20 h-20 max-sm:w-16 max-sm:h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6 max-sm:mb-4">
                                <Search className="w-10 h-10 max-sm:w-8 max-sm:h-8 text-purple-500" />
                            </div>
                            <h3 className="text-xl max-sm:text-lg font-semibold text-slate-900 mb-3 max-sm:mb-2">Start Exploring</h3>
                            <p className="text-slate-600 max-sm:text-sm max-w-md mx-auto leading-relaxed">
                                Search for photographers, creators, and friends to discover amazing content and connect with the community.
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    )
}