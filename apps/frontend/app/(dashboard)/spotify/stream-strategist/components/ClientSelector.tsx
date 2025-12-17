"use client"

import { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useClients, useCreateClient } from '../hooks/useClients';
import { Client } from '../types';

interface ClientSelectorProps {
  value?: string;
  onChange: (clientId: string) => void;
  placeholder?: string;
  allowCreate?: boolean;
}

export function ClientSelector({ value, onChange, placeholder = "Search clients or add new...", allowCreate = true }: ClientSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmails, setNewClientEmails] = useState('');
  
  const { data: clients = [], refetch: refetchClients, isLoading } = useClients();
  const createClient = useCreateClient();

  console.log('ClientSelector - clients:', clients?.length || 0, 'isLoading:', isLoading);

  const selectedClient = clients?.find((client) => client.id === value);
  
  // Filter clients based on search query
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Show "no results" message
  const showNoResults = searchQuery && filteredClients.length === 0 && !isLoading;
  
  // Update search query when client is selected
  useEffect(() => {
    if (selectedClient) {
      setSearchQuery(selectedClient.name);
    }
  }, [selectedClient]);
  
  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.client-selector-container')) {
        setShowSuggestions(false);
      }
    };
    
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleSelectClient = (client: Client) => {
    onChange(client.id);
    setSearchQuery(client.name);
    setShowSuggestions(false);
  };
  
  const handleClearSelection = () => {
    onChange('');
    setSearchQuery('');
    setShowSuggestions(false);
  };

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
      setSearchQuery(newClient.name);
      
      // Close dialog and reset form
      setShowAddDialog(false);
      setNewClientName('');
      setNewClientEmails('');
    } catch (error) {
      console.error("Error creating client:", error);
    }
  };

  return (
    <>
      <div className="relative client-selector-container">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {selectedClient && (
            <button
              type="button"
              onClick={handleClearSelection}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Suggestions Dropdown */}
        {showSuggestions && (searchQuery || !selectedClient) && (
          <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading clients...
              </div>
            ) : (
              <>
                {/* Add New Client Option */}
                {allowCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDialog(true);
                      setShowSuggestions(false);
                      setNewClientName(searchQuery);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-accent text-primary font-medium border-b"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add new client{searchQuery && `: "${searchQuery}"`}</span>
                  </button>
                )}
                
                {/* Client List */}
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleSelectClient(client)}
                      className={cn(
                        "w-full flex flex-col items-start gap-1 px-4 py-3 text-left hover:bg-accent transition-colors",
                        value === client.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{client.name}</span>
                        {client.credit_balance !== undefined && client.credit_balance > 0 && (
                          <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            ${client.credit_balance} credits
                          </span>
                        )}
                      </div>
                      {client.emails && client.emails.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {client.emails[0]}
                          {client.emails.length > 1 && ` +${client.emails.length - 1} more`}
                        </span>
                      )}
                    </button>
                  ))
                ) : showNoResults ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No clients found matching "{searchQuery}"
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create a new client for this campaign. You can add their contact emails for reporting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client-name">Client Name *</Label>
              <Input
                id="client-name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Enter client name"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="client-emails">Email Addresses (optional)</Label>
              <Textarea
                id="client-emails"
                value={newClientEmails}
                onChange={(e) => setNewClientEmails(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Comma-separated list (up to 5 emails)
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setNewClientName('');
                  setNewClientEmails('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
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








