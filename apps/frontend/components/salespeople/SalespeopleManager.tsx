"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Mail,
  Phone,
  DollarSign,
  FileText,
  CheckCircle,
  Upload,
  Search,
  UserPlus,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  useSalespeople,
  useCreateSalesperson,
  useUpdateSalesperson,
  useDeleteSalesperson,
  type Salesperson,
} from '@/hooks/use-salespeople';
import { SalespeopleImportModal } from './SalespeopleImportModal';

// ============================================================================
// Types
// ============================================================================

interface FormData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

type ViewMode = 'cards' | 'table';

// ============================================================================
// Component
// ============================================================================

export function SalespeopleManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editingPerson, setEditingPerson] = useState<Salesperson | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const { data: salespeople = [], isLoading } = useSalespeople();
  const createSalesperson = useCreateSalesperson();
  const updateSalesperson = useUpdateSalesperson();
  const deleteSalesperson = useDeleteSalesperson();

  // Filter salespeople by search query
  const filteredSalespeople = salespeople.filter(sp => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sp.name.toLowerCase().includes(q) ||
      sp.email?.toLowerCase().includes(q) ||
      sp.status?.toLowerCase().includes(q)
    );
  });

  const activeSalespeople = salespeople.filter(sp => sp.is_active);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    try {
      if (editingPerson) {
        await updateSalesperson.mutateAsync({
          id: editingPerson.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          notes: formData.notes || undefined,
        });
      } else {
        await createSalesperson.mutateAsync({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          notes: formData.notes || undefined,
        });
      }

      setFormData({ name: '', email: '', phone: '', notes: '' });
      setIsAddDialogOpen(false);
      setEditingPerson(null);
    } catch (error) {
      console.error('Error saving salesperson:', error);
    }
  };

  const handleEdit = (sp: Salesperson) => {
    setEditingPerson(sp);
    setFormData({
      name: sp.name,
      email: sp.email || '',
      phone: sp.phone || '',
      notes: sp.notes || '',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (sp: Salesperson) => {
    if (!confirm(`Are you sure you want to remove ${sp.name}?`)) return;
    try {
      await deleteSalesperson.mutateAsync(sp.id);
    } catch (error) {
      console.error('Error deleting salesperson:', error);
    }
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingPerson(null);
    setFormData({ name: '', email: '', phone: '', notes: '' });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-muted-foreground">Loading sales team...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Sales Team
          </h3>
          <p className="text-muted-foreground mt-1">
            {activeSalespeople.length} active of {salespeople.length} total salespeople
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsImportOpen(true)}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add Salesperson
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingPerson ? 'Edit Salesperson' : 'Add New Salesperson'}
                </DialogTitle>
                <DialogDescription>
                  {editingPerson
                    ? 'Update salesperson information'
                    : 'Add a new member to your sales team. This will create a login account.'}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingPerson && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                    <p className="text-blue-700 dark:text-blue-300">
                      This will create a user account with login access across all platforms.
                      A temporary password will be generated.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                </div>

                <div>
                  <Label>Email * {!editingPerson && '(used for login)'}</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                    required
                    disabled={!!editingPerson}
                  />
                </div>

                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal notes"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createSalesperson.isPending ||
                      updateSalesperson.isPending ||
                      !formData.name.trim() ||
                      !formData.email.trim()
                    }
                  >
                    {createSalesperson.isPending || updateSalesperson.isPending
                      ? 'Saving...'
                      : editingPerson
                      ? 'Save Changes'
                      : 'Add Salesperson'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search salespeople..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center border rounded-md">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="rounded-r-none"
          >
            Table
          </Button>
          <Button
            variant={viewMode === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('cards')}
            className="rounded-l-none"
          >
            Cards
          </Button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-right">Approved</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalespeople.map((sp) => (
                <TableRow key={sp.id}>
                  <TableCell className="font-medium">{sp.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {sp.email || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sp.status)}`}>
                      {sp.status || (sp.is_active ? 'Active' : 'Inactive')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{sp.total_submissions}</TableCell>
                  <TableCell className="text-right">{sp.total_approved}</TableCell>
                  <TableCell className="text-right">
                    ${(sp.total_revenue || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sp)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sp)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSalespeople.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'No salespeople match your search' : 'No salespeople added yet'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSalespeople.map((sp) => (
            <Card key={sp.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{sp.name}</CardTitle>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(sp.status)}`}>
                    {sp.status || (sp.is_active ? 'Active' : 'Inactive')}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sp.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{sp.email}</span>
                  </div>
                )}

                {sp.phone && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                    {sp.phone}
                  </div>
                )}

                {sp.notes && (
                  <p className="text-xs text-muted-foreground italic border-l-2 pl-2 border-muted">
                    {sp.notes}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <div>
                      <div className="text-lg font-semibold">{sp.total_submissions}</div>
                      <div className="text-xs text-muted-foreground">Submissions</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <div className="text-lg font-semibold">{sp.total_approved}</div>
                      <div className="text-xs text-muted-foreground">Approved</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 col-span-2">
                    <DollarSign className="w-4 h-4 text-yellow-500" />
                    <div>
                      <div className="text-lg font-semibold">
                        ${(sp.total_revenue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">Total Revenue</div>
                    </div>
                  </div>
                </div>

                {sp.total_submissions > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Success Rate:</span>
                      <span className="font-medium">
                        {Math.round((sp.total_approved / sp.total_submissions) * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(sp)}
                  >
                    <Edit className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(sp)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSalespeople.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? 'No salespeople match your search' : 'No salespeople added yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add your first salesperson or import from CSV
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Import Modal */}
      <SalespeopleImportModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </div>
  );
}
