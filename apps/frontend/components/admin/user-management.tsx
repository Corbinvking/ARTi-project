"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Trash2, Plus } from "lucide-react"

interface AdminUser {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "analyst" | "creator"
  tenantId: string
  status: "active" | "inactive"
  lastLogin: string
}

const mockUsers: AdminUser[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@company.com",
    role: "admin",
    tenantId: "tenant-1",
    status: "active",
    lastLogin: "2 hours ago",
  },
  {
    id: "2",
    name: "Manager User",
    email: "manager@company.com",
    role: "manager",
    tenantId: "tenant-1",
    status: "active",
    lastLogin: "1 day ago",
  },
  {
    id: "3",
    name: "Analyst User",
    email: "analyst@company.com",
    role: "analyst",
    tenantId: "tenant-1",
    status: "active",
    lastLogin: "3 days ago",
  },
  {
    id: "4",
    name: "Creator User",
    email: "creator@company.com",
    role: "creator",
    tenantId: "tenant-1",
    status: "inactive",
    lastLogin: "1 week ago",
  },
]

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>(mockUsers)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "creator" as AdminUser["role"],
  })

  const getRoleBadgeColor = (role: AdminUser["role"]) => {
    switch (role) {
      case "admin":
        return "bg-red-500"
      case "manager":
        return "bg-blue-500"
      case "analyst":
        return "bg-green-500"
      case "creator":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleAddUser = () => {
    const user: AdminUser = {
      id: Date.now().toString(),
      ...newUser,
      tenantId: "tenant-1",
      status: "active",
      lastLogin: "Never",
    }
    setUsers([...users, user])
    setNewUser({ name: "", email: "", role: "creator" })
    setIsAddDialogOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((user) => user.id !== userId))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>User Management</span>
        </CardTitle>
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
              <DialogDescription>Create a new user account with appropriate role permissions.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter user name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value: AdminUser["role"]) => setNewUser({ ...newUser, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.lastLogin}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
