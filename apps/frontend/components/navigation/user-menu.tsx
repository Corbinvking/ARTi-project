"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { LogOut, User, Settings, Shield } from "lucide-react"

export function UserMenu() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  
  console.log('👤 UserMenu rendering, user:', user ? user.email : 'null')

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleProfile = () => {
    router.push("/profile")
  }

  const handleSettings = () => {
    router.push("/settings")
  }

  const handleAdmin = () => {
    router.push("/admin")
  }

  if (!user) return null

  const handleTriggerClick = () => {
    console.log('🖱️ Profile icon clicked!')
    setIsOpen(!isOpen)
  }

  // Simple fallback dropdown for testing
  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        className="relative h-8 w-8 rounded-full" 
        onClick={handleTriggerClick}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg rounded-md z-[9999] py-1">
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium leading-none">{user.name || user.email}</p>
            <p className="text-xs text-gray-500 mt-1">{user.email}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
          
          <button
            onClick={handleProfile}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </button>
          
          <button
            onClick={handleSettings}
            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
          
          {user.role === 'admin' && (
            <button
              onClick={handleAdmin}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center"
            >
              <Shield className="mr-2 h-4 w-4" />
              Admin Panel
            </button>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
