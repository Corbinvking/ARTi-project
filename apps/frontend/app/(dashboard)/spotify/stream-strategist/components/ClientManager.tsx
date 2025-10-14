"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Mail,
  Users,
  CreditCard,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useClients, useCreateClient } from '../hooks/useClients';
import { useDeleteClient } from '../hooks/useDeleteClient';
import { ClientDetailsModal } from './ClientDetailsModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Client } from '../types';

const clientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  emails: z.array(z.string().email().min(1)).default(['']),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

type SortField = 'name' | 'emails' | 'credit_balance' | 'active_campaigns' | 'created_at';
type SortDirection = 'asc' | 'desc';

export function ClientManager() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientDetailsOpen, setIsClientDetailsOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: '',
      emails: [''],
      contact_person: '',
      phone: '',
      notes: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    const filteredEmails = data.emails.filter(email => email.trim() !== '');
    
    try {
      await createClient.mutateAsync({
        name: data.name,
        emails: filteredEmails,
        contact_person: data.contact_person,
        phone: data.phone,
        notes: data.notes,
        credit_balance: 0,
      });
      form.reset();
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setIsClientDetailsOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await deleteClient.mutateAsync(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-2 h-4 w-4" /> : 
      <ArrowDown className="ml-2 h-4 w-4" />;
  };

  const filteredClients = clients
    .filter(client =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.emails?.some(email => email.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'emails':
          aValue = a.emails?.length || 0;
          bValue = b.emails?.length || 0;
          break;
        case 'credit_balance':
          aValue = a.credit_balance || 0;
          bValue = b.credit_balance || 0;
          break;
        case 'active_campaigns':
          aValue = (a as any).activeCampaignsCount || 0;
          bValue = (b as any).activeCampaignsCount || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  if (isLoading) {
    return <div>Loading clients...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Manage your clients and their campaign assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client profile with contact information.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <Label>Email Addresses</Label>
                  {form.watch('emails').map((_, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <FormField
                        control={form.control}
                        name={`emails.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                placeholder={`Email ${index + 1}`}
                                type="email"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {index > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const emails = form.getValues('emails');
                            emails.splice(index, 1);
                            form.setValue('emails', emails);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {form.watch('emails').length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        const emails = form.getValues('emails');
                        emails.push('');
                        form.setValue('emails', emails);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Email
                    </Button>
                  )}
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createClient.isPending}>
                    {createClient.isPending ? 'Creating...' : 'Create Client'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search clients by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchTerm ? 'No clients found matching your search.' : 'No clients found. Create your first client to get started.'}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50 min-w-[200px] max-w-[300px]"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Client Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50 w-[100px]"
                    onClick={() => handleSort('emails')}
                  >
                    <div className="flex items-center">
                      Emails
                      {getSortIcon('emails')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50 w-[120px]"
                    onClick={() => handleSort('credit_balance')}
                  >
                    <div className="flex items-center">
                      Credit Balance
                      {getSortIcon('credit_balance')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50 w-[150px]"
                    onClick={() => handleSort('active_campaigns')}
                  >
                    <div className="flex items-center">
                      Active Campaigns
                      {getSortIcon('active_campaigns')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer select-none hover:bg-muted/50 w-[120px]"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center">
                      Created
                      {getSortIcon('created_at')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleClientClick(client)}
                  >
                    <TableCell className="font-medium">
                      <div className="truncate max-w-[280px]" title={client.name}>
                        {client.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {client.emails?.length || 0}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              {client.emails?.map((email, index) => (
                                <div key={index} className="text-xs">{email}</div>
                              )) || <div className="text-xs">No emails</div>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-600">
                          {client.credit_balance || 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-600">
                          {(client as any).activeCampaignsCount || 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          / {(client as any).totalCampaignsCount || 0} total
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(client.created_at), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClientClick(client);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClientClick(client);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Client
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive"
                                onSelect={(e) => e.preventDefault()}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Client
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{client.name}"? This action cannot be undone.
                                  All client data including credit history will be permanently deleted.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteClient(client.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ClientDetailsModal
          client={selectedClient}
          isOpen={isClientDetailsOpen}
          onClose={() => {
            setIsClientDetailsOpen(false);
            setSelectedClient(null);
          }}
        />
      </div>
    </div>
  );
}








