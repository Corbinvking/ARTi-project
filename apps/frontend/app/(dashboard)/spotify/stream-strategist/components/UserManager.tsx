"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, UserPlus } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  email: string;
  roles: string[];
  created_at: string;
  vendor_id?: string;
  vendor_name?: string; // Vendor association if user is a vendor
}

interface Vendor {
  id: string;
  name: string;
}

interface CreateUserFormData {
  email: string;
  password: string;
  roles: string[];
}

export function UserManager() {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedUserForVendor, setSelectedUserForVendor] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserFormData>({
    email: '',
    password: '',
    roles: []
  });
  const queryClient = useQueryClient();

  // Fetch all vendors for the dropdown
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data as Vendor[];
    }
  });

  // Fetch ALL users from auth.users and their roles from user_roles
  const { data: users = [], isLoading, error: queryError } = useQuery({
    queryKey: ['users-with-roles-and-vendors'],
    enabled: !!user,
    queryFn: async () => {
      console.log('🔄 Fetching all users with roles and vendor associations...');
      
      // First, get all user_roles entries
      const { data: userRolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('❌ Error fetching user roles:', rolesError);
        throw rolesError;
      }
      
      console.log('📋 Found', userRolesData?.length, 'user role entries');
      
      // Get all vendor associations
      const { data: vendorMappings, error: vendorError } = await supabase
        .from('vendor_users')
        .select('user_id, vendors ( id, name )');
      
      if (vendorError) {
        console.error('❌ Error fetching vendor mappings:', vendorError);
      }
      
      console.log('📋 Found', vendorMappings?.length, 'vendor mappings');
      
      // Group roles by user_id
      const rolesByUser = new Map<string, string[]>();
      userRolesData?.forEach(ur => {
        if (!rolesByUser.has(ur.user_id)) {
          rolesByUser.set(ur.user_id, []);
        }
        rolesByUser.get(ur.user_id)!.push(ur.role);
      });
      
      // Map vendor associations (id and name)
      const vendorByUser = new Map<string, { id: string; name: string }>();
      vendorMappings?.forEach((vm: any) => {
        if (vm.vendors?.id) {
          vendorByUser.set(vm.user_id, { id: vm.vendors.id, name: vm.vendors.name });
        }
      });
      
      // Get all unique user IDs from both sources
      const allUserIds = new Set([
        ...rolesByUser.keys(),
        ...vendorByUser.keys()
      ]);
      
      console.log('📋 Total unique users:', allUserIds.size);
      
      // Fetch user details from public.users (if exists) or construct from auth
      const usersArray: User[] = [];
      
      for (const userId of allUserIds) {
        const roles = rolesByUser.get(userId) || [];
        const vendorInfo = vendorByUser.get(userId);
        
        // Try to get user email from public.users first
        const { data: userData } = await supabase
          .from('users')
          .select('email, created_at')
          .eq('id', userId)
          .single();
        
        if (userData) {
          usersArray.push({
            id: userId,
            email: userData.email || 'Unknown',
            roles: roles,
            vendor_id: vendorInfo?.id,
            vendor_name: vendorInfo?.name,
            created_at: userData.created_at
          });
        } else {
          // User exists in user_roles or vendor_users but not in public.users
          // This shouldn't happen but let's handle it
          usersArray.push({
            id: userId,
            email: `user-${userId.substring(0, 8)}`,
            roles: roles,
            vendor_id: vendorInfo?.id,
            vendor_name: vendorInfo?.name,
            created_at: new Date().toISOString()
          });
        }
      }
      
      console.log('✅ Processed', usersArray.length, 'users');
      return usersArray;
    }
  });

  // Log query state
  console.log('UserManager - isLoading:', isLoading, 'users:', users?.length, 'error:', queryError);

  // Create user mutation - simplified
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserFormData) => {
      toast.info('User creation requires admin API access. Please use the main admin panel to create users.');
      throw new Error('Please use the main admin panel to create users');
    },
    onSuccess: () => {
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setFormData({ email: '', password: '', roles: [] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles-and-vendors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create user');
    }
  });

  // Delete user mutation - simplified
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      toast.info('User deletion requires admin API access. Please use the main admin panel to delete users.');
      throw new Error('Please use the main admin panel to delete users');
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles-and-vendors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete user');
    }
  });

  // Assign vendor to user mutation
  const assignVendorMutation = useMutation({
    mutationFn: async ({ userId, vendorId }: { userId: string; vendorId: string | null }) => {
      // First, remove any existing vendor associations for this user
      const { error: deleteError } = await supabase
        .from('vendor_users')
        .delete()
        .eq('user_id', userId);
      
      if (deleteError) {
        console.error('Error removing old vendor association:', deleteError);
        throw deleteError;
      }
      
      // If vendorId is null, we just wanted to remove the association
      if (!vendorId) {
        return { success: true, action: 'removed' };
      }
      
      // Insert the new vendor association
      const { error: insertError } = await supabase
        .from('vendor_users')
        .insert({ user_id: userId, vendor_id: vendorId });
      
      if (insertError) {
        console.error('Error assigning vendor:', insertError);
        throw insertError;
      }
      
      return { success: true, action: 'assigned' };
    },
    onSuccess: (result) => {
      const message = result.action === 'removed' 
        ? 'Vendor association removed' 
        : 'Vendor assigned successfully';
      toast.success(message);
      setSelectedUserForVendor(null);
      queryClient.invalidateQueries({ queryKey: ['users-with-roles-and-vendors'] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign vendor');
    }
  });

  const handleInputChange = (field: keyof CreateUserFormData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRoleToggle = (role: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role) 
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    createUserMutation.mutate(formData);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'salesperson': return 'secondary';
      case 'vendor': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage system users and their roles
            </CardDescription>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the system and assign their roles
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Roles</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['admin', 'manager', 'salesperson', 'vendor'].map(role => (
                        <div key={role} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={role}
                            checked={formData.roles.includes(role)}
                            onChange={() => handleRoleToggle(role)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <Label htmlFor={role} className="capitalize">
                            {role}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <Badge 
                              key={role} 
                              variant={getRoleBadgeVariant(role)}
                              className="capitalize"
                            >
                              {role}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline">No roles</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.vendor_name ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                            {user.vendor_name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUserForVendor(user)}
                          className="text-xs h-6 px-2"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUserMutation.mutate(user.id)}
                        disabled={deleteUserMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Vendor Assignment Dialog */}
      <Dialog open={!!selectedUserForVendor} onOpenChange={() => setSelectedUserForVendor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Vendor</DialogTitle>
            <DialogDescription>
              Link {selectedUserForVendor?.email} to a vendor account. This allows them to see and accept campaign requests for that vendor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Vendor</Label>
              <div>
                {selectedUserForVendor?.vendor_name ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                    {selectedUserForVendor.vendor_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">No vendor assigned</span>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Assign to Vendor</Label>
              <Select
                value={selectedUserForVendor?.vendor_id || ''}
                onValueChange={(vendorId) => {
                  if (selectedUserForVendor) {
                    assignVendorMutation.mutate({ 
                      userId: selectedUserForVendor.id, 
                      vendorId: vendorId || null 
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— No Vendor —</SelectItem>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedUserForVendor(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}








