"use client"

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, Phone, DollarSign, FileText, CheckCircle } from 'lucide-react';
import { useSalespeople, useCreateSalesperson, useUpdateSalesperson } from '../hooks/useSalespeople';

interface FormData {
  name: string;
  email: string;
  phone: string;
}

export function SalespeopleManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: ''
  });

  const { data: salespeople = [], isLoading } = useSalespeople();
  const createSalesperson = useCreateSalesperson();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;

    try {
      await createSalesperson.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined
      });

      setFormData({ name: '', email: '', phone: '' });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating salesperson:', error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading salespeople...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold">Sales Team</h3>
          <p className="text-muted-foreground">
            Track your sales team performance and submissions
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Salesperson
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Salesperson</DialogTitle>
              <DialogDescription>
                Add a new member to your sales team
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
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
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSalesperson.isPending || !formData.name.trim()}
                >
                  {createSalesperson.isPending ? 'Adding...' : 'Add Salesperson'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {salespeople.map((salesperson) => (
          <Card key={salesperson.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{salesperson.name}</CardTitle>
                <Badge variant={salesperson.is_active ? "default" : "secondary"}>
                  {salesperson.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Contact Info */}
              {salesperson.email && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 mr-2" />
                  {salesperson.email}
                </div>
              )}
              
              {salesperson.phone && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 mr-2" />
                  {salesperson.phone}
                </div>
              )}

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-lg font-semibold">{salesperson.total_submissions}</div>
                    <div className="text-xs text-muted-foreground">Submissions</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <div>
                    <div className="text-lg font-semibold">{salesperson.total_approved}</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 col-span-2">
                  <DollarSign className="w-4 h-4 text-yellow-500" />
                  <div>
                    <div className="text-lg font-semibold">
                      ${salesperson.total_revenue.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Revenue</div>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              {salesperson.total_submissions > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {Math.round((salesperson.total_approved / salesperson.total_submissions) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {salespeople.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No salespeople added yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add your first salesperson to start tracking submissions
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}








