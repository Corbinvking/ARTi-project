"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Trash2, Plus, Loader2, Settings } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"
import { toast } from "sonner"
import { PermissionMatrix } from "./permission-matrix"

const PLATFORMS = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '🎧' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
]

// Default permissions based on role
const getDefaultPermissions = (role: string) => {
  switch (role) {
    case 'admin':
      return PLATFORMS.map(p => ({ platform: p.id, can_read: true, can_write: true, can_delete: true }))
    case 'manager':
      return PLATFORMS.map(p => ({ platform: p.id, can_read: true, can_write: true, can_delete: false }))
    case 'sales':
      return [
        { platform: 'dashboard', can_read: true, can_write: true, can_delete: false },
        { platform: 'instagram', can_read: true, can_write: true, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: true, can_delete: false },
        { platform: 'youtube', can_read: true, can_write: true, can_delete: false }
      ]
    case 'vendor':
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false },
        { platform: 'soundcloud', can_read: true, can_write: false, can_delete: false }
      ]
    default:
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false }
      ]
  }
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: "admin" | "manager" | "sales" | "vendor"
  org_id?: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  vendor_name?: string
  permissions?: Array<{
    platform: string
    can_read: boolean
    can_write: boolean
    can_delete: boolean
  }>
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "vendor" as AdminUser["role"],
  })
  const [customPermissions, setCustomPermissions] = useState<Array<{
    platform: string
    can_read: boolean
    can_write: boolean
    can_delete: boolean
  }>>([])
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)
  const { user: currentUser } = useAuth()

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      
      console.log('🔄 Loading ALL users from public.users...')
      
      // FIRST: Get ALL users from public.users (which mirrors auth.users)
      const { data: allUsersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, created_at, avatar_url')
        .order('created_at', { ascending: false })
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError)
        toast.error('Failed to load users')
        return
      }
      
      console.log('📋 Found', allUsersData?.length, 'total users in public.users')
      
      // Get all user_roles entries
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
      
      if (rolesError) {
        console.error('❌ Error fetching user roles:', rolesError)
      }
      
      console.log('📋 Found', userRolesData?.length, 'user role entries')
      
      // Get all vendor associations
      const { data: vendorMappings, error: vendorError } = await supabase
        .from('vendor_users')
        .select('user_id, vendors ( id, name )')
      
      if (vendorError) {
        console.error('❌ Error fetching vendor mappings:', vendorError)
      }
      
      console.log('📋 Found', vendorMappings?.length, 'vendor mappings')
      
      // Get all user permissions
      const { data: allPermissions, error: permError } = await supabase
        .from('user_permissions')
        .select('user_id, platform, can_read, can_write, can_delete')
      
      if (permError) {
        console.error('❌ Permissions error:', permError)
      }
      
      // Create lookup maps
      const rolesByUser = new Map<string, string>()
      userRolesData?.forEach(ur => {
        if (!rolesByUser.has(ur.user_id)) {
          rolesByUser.set(ur.user_id, ur.role)
        }
      })
      
      const vendorByUser = new Map<string, string>()
      vendorMappings?.forEach((vm: any) => {
        if (vm.vendors?.name) {
          vendorByUser.set(vm.user_id, vm.vendors.name)
        }
      })
      
      const permsByUser = new Map<string, any[]>()
      allPermissions?.forEach(p => {
        if (!permsByUser.has(p.user_id)) {
          permsByUser.set(p.user_id, [])
        }
        permsByUser.get(p.user_id)!.push({
          platform: p.platform,
          can_read: p.can_read,
          can_write: p.can_write,
          can_delete: p.can_delete
        })
      })
      
      // Map ALL users from public.users with their roles/vendors/permissions
      const usersArray: AdminUser[] = allUsersData.map(user => ({
        id: user.id,
        email: user.email || `user-${user.id.substring(0, 8)}`,
        name: user.full_name || user.email?.split('@')[0] || 'Unknown',
        role: (rolesByUser.get(user.id) || 'vendor') as AdminUser['role'],
        created_at: user.created_at,
        permissions: permsByUser.get(user.id) || [],
        vendor_name: vendorByUser.get(user.id)
      }))
      
      console.log('✅ Loaded ALL users:', usersArray.length)
      setUsers(usersArray)
      
    } catch (error) {
      console.error('❌ Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePermissions = async (userId: string, permissions: any[]) => {
    try {
      console.log('🔄 Updating permissions for user:', userId, permissions)
      
      // Use secure API route with service role key
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ permissions })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to update permissions: ${response.status}`)
      }

      const data = await response.json()
      console.log('✅ Permissions updated:', data.permissions_count, 'permissions')

      // Refresh users to show updated permissions
      await loadUsers()
      
    } catch (error) {
      console.error('❌ Failed to update permissions:', error)
      throw error
    }
  }

  const updateCustomPermission = (platformId: string, permissionType: string, value: boolean) => {
    setCustomPermissions(prev => {
      const existing = prev.find(p => p.platform === platformId)
      if (existing) {
        return prev.map(p => 
          p.platform === platformId 
            ? { ...p, [permissionType]: value }
            : p
        )
      } else {
        return [...prev, {
          platform: platformId,
          can_read: permissionType === 'can_read' ? value : false,
          can_write: permissionType === 'can_write' ? value : false,
          can_delete: permissionType === 'can_delete' ? value : false
        }]
      }
    })
  }

  // Initialize custom permissions when role changes
  const handleRoleChange = (role: string) => {
    setNewUser({ ...newUser, role: role as AdminUser["role"] })
    if (!useCustomPermissions) {
      const defaultPerms = getDefaultPermissions(role)
      setCustomPermissions(defaultPerms)
    }
  }

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Prepare the user data with permissions
      const userData = {
        ...newUser,
        permissions: useCustomPermissions ? customPermissions : getDefaultPermissions(newUser.role)
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      
      const response = await fetch(`${apiBaseUrl}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to create user: ${response.status}`)
      }

      const data = await response.json()
      
      toast.success('User created successfully')
      setIsAddDialogOpen(false)
      setNewUser({ email: "", password: "", name: "", role: "vendor" })
      setUseCustomPermissions(false) // Reset custom permissions toggle
      setCustomPermissions([]) // Clear custom permissions state
      
      // Reload users to show the new user
      await loadUsers()
      
    } catch (error) {
      console.error('❌ Failed to create user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Prevent self-deletion
    if (currentUser && userId === currentUser.id) {
      toast.error('You cannot delete your own account')
      return
    }

    if (!confirm(`Are you sure you want to delete user ${userEmail}?`)) {
      return
    }

    try {
      setIsDeleting(userId)
      
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
      
      const response = await fetch(`${apiBaseUrl}/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to delete user: ${response.status}`)
      }

      toast.success('User deleted successfully')
      
      // Remove user from local state
      setUsers(users.filter(user => user.id !== userId))
      
    } catch (error) {
      console.error('❌ Failed to delete user:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    } finally {
      setIsDeleting(null)
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800"
      case "manager": return "bg-blue-100 text-blue-800"
      case "sales": return "bg-green-100 text-green-800"
      case "vendor": return "bg-orange-100 text-orange-800"
      case "analyst": return "bg-purple-100 text-purple-800"
      case "creator": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
    } catch {
      return 'Invalid date'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>User Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>User Management</span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>
                  Create a new user account with specified role and permissions.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="password" className="text-right">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="col-span-3"
                    placeholder="Enter password"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Role
                  </Label>
                  <Select
                    value={newUser.role}
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Permissions Toggle */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    Custom Permissions
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Checkbox
                      id="custom-permissions"
                      checked={useCustomPermissions}
                                  onCheckedChange={(checked) => {
                        const isChecked = checked === true
                        setUseCustomPermissions(isChecked)
                        if (!isChecked) {
                          // Reset to default permissions for role
                          setCustomPermissions(getDefaultPermissions(newUser.role))
                        }
                      }}
                    />
                    <Label htmlFor="custom-permissions" className="text-sm">
                      Override default role permissions
                    </Label>
                  </div>
                </div>

                {/* Platform Permissions */}
                {useCustomPermissions && (
                  <div className="col-span-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Platform Access</h4>
                      <div className="space-y-3">
                        {PLATFORMS.map((platform) => {
                          const permission = customPermissions.find(p => p.platform === platform.id)
                          return (
                            <div key={platform.id} className="grid grid-cols-6 items-center gap-2">
                              <div className="col-span-2 flex items-center space-x-2">
                                <span>{platform.icon}</span>
                                <span className="text-sm font-medium">{platform.name}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${platform.id}-read`}
                                  checked={permission?.can_read || false}
                                  onCheckedChange={(checked) => 
                                    updateCustomPermission(platform.id, 'can_read', checked === true)
                                  }
                                />
                                <Label htmlFor={`${platform.id}-read`} className="text-xs">View</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${platform.id}-write`}
                                  checked={permission?.can_write || false}
                                  onCheckedChange={(checked) => 
                                    updateCustomPermission(platform.id, 'can_write', checked === true)
                                  }
                                />
                                <Label htmlFor={`${platform.id}-write`} className="text-xs">Edit</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${platform.id}-delete`}
                                  checked={permission?.can_delete || false}
                                  onCheckedChange={(checked) => 
                                    updateCustomPermission(platform.id, 'can_delete', checked === true)
                                  }
                                />
                                <Label htmlFor={`${platform.id}-delete`} className="text-xs">Delete</Label>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddUser}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || user.email.split('@')[0]}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)} variant="secondary">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.vendor_name ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        {user.vendor_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                      {user.email_confirmed_at ? "active" : "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={isDeleting === user.id || (currentUser?.id === user.id)}
                      >
                        {isDeleting === user.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {users.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Total users: {users.length}
          </div>
        )}
      </CardContent>
    </Card>

    {/* Permission Matrix */}
    <PermissionMatrix 
      users={users}
      onUpdatePermissions={handleUpdatePermissions}
      onRefresh={loadUsers}
    />
    </div>
  )
}