'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Search, PlusSquare, Heart, User, Camera } from 'lucide-react'
import {
    SignInButton,
    ClerkProvider,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/nextjs'

import NotificationDropdown from '@/components/Notification'

const Navbar = () => {
    const [activeTab, setActiveTab] = useState('home')

    return (
        <ClerkProvider>
            {/* Top Brand Bar - Desktop Only */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className=" lg:flex  sm:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100"
            >
                <div className="max-w-6xl flex  mx-auto px-6 py-4">
                    <Link href="/" className="flex items-center space-x-2 max-sm:mx-auto">
                        <Camera className="w-6 h-6 text-gray-600" />
                        <span className="text-xl font-extralight text-gray-900 ">LensBook</span>
                    </Link>
                    
                </div>
                
            </motion.div>

            {/* Bottom Navigation - Mobile */}
            <motion.nav
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-sm:fixed lg:hidden max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:z-50 max-sm:bg-white max-sm:border-t max-sm:border-gray-100"
            >
                <div className="max-sm:px-4 max-sm:py-2">
                    <div className="max-sm:flex max-sm:justify-around max-sm:items-center">
                        <NavItem 
                            icon={Home} 
                            href="/" 
                            isActive={activeTab === 'home'}
                            onClick={() => setActiveTab('home')}
                        />
                        <NavItem 
                            icon={Search} 
                            href="/search" 
                            isActive={activeTab === 'search'}
                            onClick={() => setActiveTab('search')}
                        />
                        <NavItem 
                            icon={PlusSquare} 
                            href="/addphoto" 
                            isActive={activeTab === 'addphoto'}
                            onClick={() => setActiveTab('addphoto')}
                        />
                        <div className="max-sm:p-1">
                            <NotificationDropdown/>
                        </div>
                        
                        <SignedOut>
                            <div className="flex items-center space-x-2 max-sm:scale-75">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 bg-black max-sm:text-xl text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors max-sm:px-4 max-sm:py-1"
                                >
                                    <SignInButton />
                                </motion.div>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            {/* icon of a profile */}
                            <div className="flex items-center space-x-2">
                            <NavItem
                                icon={User} 
                                href="/profile" 
                                isActive={activeTab === 'profile'}
                                onClick={() => setActiveTab('profile')}
                                isDesktop
                            />
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </motion.nav>

            {/* Bottom Navigation - Desktop */}
            <motion.nav
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="hidden sm:block fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
            >
                <div className="bg-white/80 backdrop-blur-xl rounded-full border border-gray-200 shadow-lg px-6 py-3">
                    <div className="flex items-center space-x-8">
                        <NavItem 
                            icon={Home} 
                            href="/" 
                            isActive={activeTab === 'home'}
                            onClick={() => setActiveTab('home')}
                            isDesktop
                        />
                        <NavItem 
                            icon={Search} 
                            href="/search" 
                            isActive={activeTab === 'search'}
                            onClick={() => setActiveTab('search')}
                            isDesktop
                        />
                        <NavItem 
                            icon={PlusSquare} 
                            href="/addphoto" 
                            isActive={activeTab === 'addphoto'}
                            onClick={() => setActiveTab('addphoto')}
                            isDesktop
                        />
                        
                        <NotificationDropdown/>
                        
                        
                        <SignedOut>
                            <div className="flex items-center space-x-2">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-4 py-2 bg-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                                >
                                    <SignInButton />
                                </motion.div>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            {/* icon of a profile */}
                            <div className="flex items-center space-x-2">
                            <NavItem
                                icon={User} 
                                href="/profile" 
                                isActive={activeTab === 'profile'}
                                onClick={() => setActiveTab('profile')}
                                isDesktop
                            />
                            </div>
                        </SignedIn>
                    </div>
                </div>
            </motion.nav>
        </ClerkProvider>
    )
}

// Navigation Item Component
const NavItem = ({ 
    icon: Icon, 
    href, 
    isActive, 
    onClick, 
    isDesktop = false 
}: { 
    icon: any; 
    href: string; 
    isActive: boolean; 
    onClick: () => void;
    isDesktop?: boolean;
}) => (
    <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
    >
        <Link
            href={href}
            onClick={onClick}
            className={`flex items-center justify-center p-3 transition-all duration-200 ${
                isDesktop ? 'rounded-full' : 'rounded-lg'
            } ${
                isActive 
                    ? 'text-gray-900' 
                    : 'text-gray-400 hover:text-gray-600'
            }`}
        >
            <Icon 
                className={`w-6 h-6 ${
                    isActive ? 'fill-current' : ''
                }`} 
                strokeWidth={isActive ? 2 : 1.5}
            />
        </Link>
    </motion.div>
)

export default Navbar
