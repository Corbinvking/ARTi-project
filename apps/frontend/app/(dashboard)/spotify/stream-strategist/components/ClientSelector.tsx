"use client"

import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClients, useCreateClient } from '../hooks/useClients';
import { Client } from '../types';

interface ClientSelectorProps {
  value?: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function ClientSelector({ value, onChange, placeholder = "Select client...", allowCreate = true }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmails, setNewClientEmails] = useState('');
  
  const { data: clients, refetch: refetchClients } = useClients();
  const createClient = useCreateClient();

  const selectedClient = clients?.find((client) => client.id === value);

  const handleAddClient = async () => {
    if (!newClientName.trim()) return;
    
    const emailArray = newClientEmails
      ? newClientEmails.split(',').map(e => e.trim()).filter(e => e).slice(0, 5)
      : [];

    try {
      const newClient = await createClient.mutateAsync({
        name: newClientName.trim(),
        emails: emailArray,
        credit_balance: 0,
      });

      // Refresh the clients list to ensure it includes the new client
      await refetchClients();

      // Update the selected client immediately
      onChange(newClient.id);
      
      // Close dialog and reset form
      setShowAddDialog(false);
      setOpen(false);
      setNewClientName('');
      setNewClientEmails('');
    } catch (error) {
      console.error("Error creating client:", error);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {selectedClient ? selectedClient.name : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0 z-50 bg-popover">
          <Command>
            <CommandInput placeholder="Search clients..." />
            <CommandList>
              <CommandEmpty>No clients found.</CommandEmpty>
              <CommandGroup>
                {allowCreate && (
                  <CommandItem
                    onSelect={() => {
                      setShowAddDialog(true);
                      setOpen(false);
                    }}
                    className="font-medium text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add new client
                  </CommandItem>
                )}
                {clients?.map((client) => (
                  <CommandItem
                    key={client.id}
                    onSelect={() => {
                      onChange(client.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === client.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{client.name}</span>
                      {client.emails && client.emails.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {client.emails[0]} {client.emails.length > 1 && `+${client.emails.length - 1} more`}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client to continue with campaign setup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name</Label>
              <Input
                id="client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name"
              />
            </div>
            <div>
              <Label htmlFor="client-emails">Email Addresses (optional, up to 5)</Label>
              <Input
                id="client-emails"
                value={newClientEmails}
                onChange={(e) => setNewClientEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddClient}
                disabled={!newClientName.trim() || createClient.isPending}
              >
                {createClient.isPending ? 'Creating...' : 'Add Client'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}








