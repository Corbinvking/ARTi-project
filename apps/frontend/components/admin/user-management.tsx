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
import { Trash2, Plus, Loader2, Pencil, Eye, EyeOff, Copy, KeyRound, RefreshCw, Search, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { supabase } from "@/lib/auth"
import { toast } from "sonner"

const PLATFORMS = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '🎧' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
]

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'operator', label: 'Operator' },
  { value: 'sales', label: 'Sales' },
  { value: 'vendor', label: 'Vendor' },
]

const getDefaultPermissions = (role: string) => {
  switch (role) {
    case 'admin':
      return PLATFORMS.map(p => ({ platform: p.id, can_read: true, can_write: true, can_delete: true }))
    case 'manager':
      return PLATFORMS.map(p => ({ platform: p.id, can_read: true, can_write: true, can_delete: false }))
    case 'sales': case 'salesperson':
      return [
        { platform: 'dashboard', can_read: true, can_write: true, can_delete: false },
        { platform: 'instagram', can_read: true, can_write: true, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: true, can_delete: false },
        { platform: 'youtube', can_read: true, can_write: true, can_delete: false },
        { platform: 'soundcloud', can_read: true, can_write: true, can_delete: false },
      ]
    case 'operator':
      return PLATFORMS.map(p => ({ platform: p.id, can_read: true, can_write: true, can_delete: false }))
    case 'vendor':
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false },
        { platform: 'soundcloud', can_read: true, can_write: false, can_delete: false },
      ]
    default:
      return [
        { platform: 'dashboard', can_read: true, can_write: false, can_delete: false },
        { platform: 'spotify', can_read: true, can_write: false, can_delete: false },
      ]
  }
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  org_id?: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  vendor_name?: string
  admin_set_password?: string | null
  permissions?: Array<{
    platform: string
    can_read: boolean
    can_write: boolean
    can_delete: boolean
  }>
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Add user dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ email: "", password: "", name: "", role: "sales" })

  // Edit user dialog
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({ name: "", role: "", password: "" })
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [backfilling, setBackfilling] = useState(false)
  const { user: currentUser } = useAuth()

  useEffect(() => { loadUsers() }, [])

  // --------------------------------------------------------------------------
  // Load users - tries admin API first, falls back to direct DB query
  // --------------------------------------------------------------------------
  const loadUsers = async () => {
    try {
      setLoading(true)

      // Query public.users + user_roles + profiles directly
      let usersArray: AdminUser[] = []
      {
        const { data: allUsersData, error: usersError } = await supabase
          .from('users')
          .select('id, email, full_name, created_at, avatar_url')
          .order('created_at', { ascending: false })

        if (usersError) {
          throw new Error('Failed to load users from database')
        }

        // Get user_roles
        const { data: userRolesData } = await supabase
          .from('user_roles')
          .select('user_id, role')

        // Get profiles (has admin_set_password in metadata JSONB)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, role, metadata')

        // Get user permissions
        const { data: allPermissions } = await supabase
          .from('user_permissions')
          .select('user_id, platform, can_read, can_write, can_delete')

        // Get vendor mappings
        const { data: vendorMappings } = await supabase
          .from('vendor_users')
          .select('user_id, vendors ( id, name )')

        // Build lookup maps
        const rolesByUser = new Map<string, string>()
        userRolesData?.forEach((ur: any) => {
          if (!rolesByUser.has(ur.user_id)) rolesByUser.set(ur.user_id, ur.role)
        })

        const profilesByUser = new Map<string, any>()
        profilesData?.forEach((p: any) => profilesByUser.set(p.id, p))

        const vendorByUser = new Map<string, string>()
        vendorMappings?.forEach((vm: any) => {
          if (vm.vendors?.name) vendorByUser.set(vm.user_id, vm.vendors.name)
        })

        const permsByUser = new Map<string, any[]>()
        allPermissions?.forEach((p: any) => {
          if (!permsByUser.has(p.user_id)) permsByUser.set(p.user_id, [])
          permsByUser.get(p.user_id)!.push({ platform: p.platform, can_read: p.can_read, can_write: p.can_write, can_delete: p.can_delete })
        })

        usersArray = (allUsersData || []).map(user => {
          const profile = profilesByUser.get(user.id)
          const role = rolesByUser.get(user.id) || profile?.role || 'vendor'
          return {
            id: user.id,
            email: user.email || `user-${user.id.substring(0, 8)}`,
            name: user.full_name || user.email?.split('@')[0] || 'Unknown',
            role: role as AdminUser['role'],
            created_at: user.created_at,
            permissions: permsByUser.get(user.id) || [],
            vendor_name: vendorByUser.get(user.id),
            admin_set_password: profile?.metadata?.admin_set_password || null,
          }
        })
      }

      setUsers(usersArray)
      console.log('Loaded', usersArray.length, 'users')
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  // --------------------------------------------------------------------------
  // Add user
  // --------------------------------------------------------------------------
  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      // Use Next.js API route (same origin, server-side with service role key)
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`/api/admin/users/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          roles: [newUser.role === 'sales' ? 'salesperson' : newUser.role],
        })
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create user')
      }
      
      const data = await response.json()
      
      // Also update public.users + user_roles + profiles for the new user
      if (data.user?.id) {
        await supabase.from('users').upsert({
          id: data.user.id,
          email: newUser.email,
          full_name: newUser.name,
        }, { onConflict: 'id' })
        
        const roleMap: Record<string, string> = { sales: 'salesperson', admin: 'admin', manager: 'manager', vendor: 'vendor', operator: 'operator' }
        await supabase.from('user_roles').upsert({
          user_id: data.user.id,
          role: roleMap[newUser.role] || newUser.role,
        }, { onConflict: 'user_id' }).select()

        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          metadata: { admin_set_password: newUser.password },
        }, { onConflict: 'id' })
      }

      toast.success('User created successfully')
      setIsAddDialogOpen(false)
      setNewUser({ email: "", password: "", name: "", role: "sales" })
      await loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
    }
  }

  // --------------------------------------------------------------------------
  // Edit user
  // --------------------------------------------------------------------------
  const openEditDialog = (user: AdminUser) => {
    setEditUser(user)
    setEditForm({
      name: user.name,
      role: user.role === 'salesperson' ? 'sales' : user.role,
      password: "",
    })
    setShowEditPassword(false)
  }

  const handleSaveUser = async () => {
    if (!editUser) return
    setIsSaving(true)
    try {
      const body: any = {}
      if (editForm.name && editForm.name !== editUser.name) body.name = editForm.name
      const normalizedRole = editUser.role === 'salesperson' ? 'sales' : editUser.role
      if (editForm.role && editForm.role !== normalizedRole) body.role = editForm.role
      if (editForm.password) body.password = editForm.password

      if (Object.keys(body).length === 0) {
        toast.info('No changes to save')
        setEditUser(null)
        return
      }

      // Use Next.js API route (same origin, server-side with service role key)
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update user')
      }

      toast.success('User updated successfully')
      setEditUser(null)
      await loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    } finally {
      setIsSaving(false)
    }
  }

  // --------------------------------------------------------------------------
  // Backfill passwords for admin/operator/vendor users that don't have one stored
  // --------------------------------------------------------------------------
  const handleBackfillPasswords = async () => {
    try {
      setBackfilling(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('You must be logged in')
        return
      }
      const response = await fetch('/api/admin/users/backfill-passwords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'same-origin',
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || `Backfill failed (${response.status})`)
      }
      toast.success(data.message || 'Passwords backfilled')
      await loadUsers()
    } catch (error: any) {
      toast.error(error.message || 'Backfill failed')
    } finally {
      setBackfilling(false)
    }
  }

  // --------------------------------------------------------------------------
  // Delete user
  // --------------------------------------------------------------------------
  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (currentUser && userId === currentUser.id) {
      toast.error('You cannot delete your own account')
      return
    }
    if (!confirm(`Are you sure you want to delete ${userEmail}?`)) return

    try {
      setIsDeleting(userId)
      // Use Next.js API route (same origin, server-side with service role key)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to delete user')
      }
      toast.success('User deleted')
      setUsers(users.filter(u => u.id !== userId))
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user')
    } finally {
      setIsDeleting(null)
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "manager": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
      case "operator": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400"
      case "sales": case "salesperson": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      case "vendor": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
    }
  }

  const formatDate = (d?: string) => {
    if (!d) return 'Never'
    try { return new Date(d).toLocaleDateString() } catch { return '—' }
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = roleFilter === "all" || u.role === roleFilter || 
      (roleFilter === "sales" && u.role === "salesperson")
    return matchesSearch && matchesRole
  })

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading users...</span>
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
            <Users className="h-5 w-5" />
            <span>User Management</span>
            <Badge variant="secondary" className="ml-2">{users.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={backfilling} onClick={handleBackfillPasswords}>
              {backfilling ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1" />}
              {backfilling ? 'Backfilling…' : 'Backfill passwords'}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add User</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account with login credentials.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Name</Label>
                  <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="col-span-3" placeholder="Full name" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Email</Label>
                  <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="col-span-3" placeholder="email@example.com" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Password</Label>
                  <div className="col-span-3 flex gap-2">
                    <Input value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="flex-1" placeholder="Password" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewUser({...newUser, password: generatePassword()})}>
                      <RefreshCw className="h-3 w-3 mr-1" />Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Role</Label>
                  <Select value={newUser.role} onValueChange={role => setNewUser({...newUser, role})}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddUser} disabled={!newUser.email || !newUser.password || !newUser.name}>Add User</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Password</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery || roleFilter !== "all" ? 'No users match your filters' : 'No users found'}
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.role === 'vendor' && user.vendor_name ? user.vendor_name : user.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{user.email}</span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(user.email, 'Email')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)} variant="secondary">
                      {user.role === 'salesperson' ? 'sales' : user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.admin_set_password ? (
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {user.admin_set_password}
                        </code>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyToClipboard(user.admin_set_password!, 'Password')}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.email_confirmed_at ? "default" : "secondary"}>
                      {user.email_confirmed_at ? "active" : "pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.last_sign_in_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={isDeleting === user.id || currentUser?.id === user.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {isDeleting === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>

        {filteredUsers.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        )}
      </CardContent>
    </Card>

    {/* Edit User Dialog */}
    <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{editUser?.email}</DialogDescription>
        </DialogHeader>
        {editUser && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={role => setEditForm({...editForm, role})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Current Password
              </Label>
              {editUser.admin_set_password ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono">
                    {showEditPassword ? editUser.admin_set_password : '••••••••••••'}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => setShowEditPassword(!showEditPassword)}>
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(editUser.admin_set_password!, 'Password')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No stored password</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Set New Password</Label>
              <div className="flex gap-2">
                <Input
                  value={editForm.password}
                  onChange={e => setEditForm({...editForm, password: e.target.value})}
                  placeholder="Leave blank to keep current"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => setEditForm({...editForm, password: generatePassword()})}>
                  <RefreshCw className="h-3 w-3 mr-1" />Generate
                </Button>
              </div>
              {editForm.password && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Password will be changed to: <code className="font-mono">{editForm.password}</code>
                </p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
          <Button onClick={handleSaveUser} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}
