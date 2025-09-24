"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Settings, Save, X } from "lucide-react"
import { toast } from "sonner"
import { refreshUserPermissions } from "@/lib/auth"

interface Permission {
  platform: string
  can_read: boolean
  can_write: boolean
  can_delete: boolean
}

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  permissions?: Permission[]
}

interface PermissionMatrixProps {
  users: AdminUser[]
  onUpdatePermissions: (userId: string, permissions: Permission[]) => Promise<void>
  onRefresh: () => void
}

const PLATFORMS = [
  { id: 'dashboard', name: 'Dashboard', icon: '📊' },
  { id: 'instagram', name: 'Instagram', icon: '📸' },
  { id: 'spotify', name: 'Spotify', icon: '🎵' },
  { id: 'soundcloud', name: 'SoundCloud', icon: '🎧' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
]

const PERMISSION_TYPES = [
  { id: 'can_read', name: 'View', description: 'Can view platform data' },
  { id: 'can_write', name: 'Edit', description: 'Can create/modify data' },
  { id: 'can_delete', name: 'Delete', description: 'Can delete data' }
]

export function PermissionMatrix({ users, onUpdatePermissions, onRefresh }: PermissionMatrixProps) {
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editPermissions, setEditPermissions] = useState<Permission[]>([])
  const [saving, setSaving] = useState(false)

  const handleEditPermissions = (user: AdminUser) => {
    setEditingUser(user)
    
    // Initialize permissions for all platforms
    const currentPermissions: Permission[] = PLATFORMS.map(platform => {
      const existing = user.permissions?.find(p => p.platform === platform.id)
      return existing || {
        platform: platform.id,
        can_read: false,
        can_write: false,
        can_delete: false
      }
    })
    
    setEditPermissions(currentPermissions)
  }

  const updatePermission = (platformId: string, permissionType: keyof Permission, value: boolean) => {
    setEditPermissions(prev => 
      prev.map(perm => 
        perm.platform === platformId 
          ? { ...perm, [permissionType]: value }
          : perm
      )
    )
  }

  const handleSavePermissions = async () => {
    if (!editingUser) return

    try {
      setSaving(true)
      await onUpdatePermissions(editingUser.id, editPermissions)
      toast.success(`Updated permissions for ${editingUser.name}`)
      setEditingUser(null)
      onRefresh()
      
      // Refresh permissions for all users to update navigation
      await refreshUserPermissions()
    } catch (error) {
      console.error('Failed to update permissions:', error)
      toast.error('Failed to update permissions')
    } finally {
      setSaving(false)
    }
  }

  const getUserPermissionSummary = (user: AdminUser) => {
    const platformCount = user.permissions?.length || 0
    const readableCount = user.permissions?.filter(p => p.can_read).length || 0
    return `${readableCount}/${PLATFORMS.length} platforms`
  }

  const hasPermission = (user: AdminUser, platformId: string, permissionType: keyof Permission) => {
    const permission = user.permissions?.find(p => p.platform === platformId)
    return permission?.[permissionType] || false
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-800"
      case "manager": return "bg-blue-100 text-blue-800"
      case "sales": return "bg-green-100 text-green-800"
      case "vendor": return "bg-orange-100 text-orange-800"
      case "analyst": return "bg-purple-100 text-purple-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Platform Permissions</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Permission Overview Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Platform Access</TableHead>
                <TableHead>Quick View</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(user.role)} variant="secondary">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {getUserPermissionSummary(user)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {PLATFORMS.map((platform) => {
                        const canRead = hasPermission(user, platform.id, 'can_read')
                        return (
                          <div
                            key={platform.id}
                            className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                              canRead ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                            }`}
                            title={`${platform.name}: ${canRead ? 'Access' : 'No Access'}`}
                          >
                            {platform.icon}
                          </div>
                        )
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPermissions(user)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Edit Permissions for {editingUser?.name}</DialogTitle>
                          <DialogDescription>
                            Configure which platforms this user can access and their permission level on each platform.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="py-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Platform</TableHead>
                                {PERMISSION_TYPES.map(permType => (
                                  <TableHead key={permType.id} className="text-center">
                                    <div>
                                      <div className="font-medium">{permType.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {permType.description}
                                      </div>
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {PLATFORMS.map((platform) => {
                                const permission = editPermissions.find(p => p.platform === platform.id)
                                return (
                                  <TableRow key={platform.id}>
                                    <TableCell>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-lg">{platform.icon}</span>
                                        <span className="font-medium">{platform.name}</span>
                                      </div>
                                    </TableCell>
                                    {PERMISSION_TYPES.map(permType => (
                                      <TableCell key={permType.id} className="text-center">
                                        <Checkbox
                                          checked={permission?.[permType.id as 'can_read' | 'can_write' | 'can_delete'] || false}
                                          onCheckedChange={(checked) => 
                                            updatePermission(platform.id, permType.id as 'can_read' | 'can_write' | 'can_delete', checked === true)
                                          }
                                        />
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSavePermissions}
                            disabled={saving}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {saving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
