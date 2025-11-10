"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  ExternalLink,
  Search,
  Filter,
  User,
  Music,
  Clock
} from 'lucide-react';

interface AvoidListItem {
  id: string;
  avoided_handle: string;
  platform: string;
  reason?: string;
  created_at: string;
}

export const AvoidListManager = () => {
  const { member } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [avoidList, setAvoidList] = useState<AvoidListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    handle: '',
    platform: 'soundcloud',
    reason: ''
  });

  const fetchAvoidList = async () => {
    if (!member?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('avoid_list_items')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAvoidList(data || []);
    } catch (error: any) {
      console.error('Error fetching avoid list:', error);
      toast({
        title: "Error",
        description: "Failed to fetch your avoid list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvoidList();
  }, [member?.id]);

  const handleAddItem = async () => {
    if (!member?.id || !newItem.handle.trim()) return;

    // Basic SoundCloud handle validation
    const cleanHandle = newItem.handle.replace(/https?:\/\/(www\.)?soundcloud\.com\//, '').replace(/\/$/, '');
    
    if (!cleanHandle) {
      toast({
        title: "Invalid Handle",
        description: "Please enter a valid SoundCloud handle or URL",
        variant: "destructive",
      });
      return;
    }

    // Check if already exists
    const exists = avoidList.some(item => 
      item.avoided_handle.toLowerCase() === cleanHandle.toLowerCase() && 
      item.platform === newItem.platform
    );

    if (exists) {
      toast({
        title: "Already Exists",
        description: "This account is already in your avoid list",
        variant: "destructive",
      });
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from('avoid_list_items')
        .insert([{
          member_id: member.id,
          avoided_handle: cleanHandle,
          platform: newItem.platform,
          reason: newItem.reason.trim() || null
        }])
        .select()
        .single();

      if (error) throw error;

      setAvoidList(prev => [data, ...prev]);
      setNewItem({ handle: '', platform: 'soundcloud', reason: '' });
      setShowAddForm(false);

      toast({
        title: "Account Added",
        description: `${cleanHandle} has been added to your avoid list`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add account to avoid list",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveItem = async (id: string, handle: string) => {
    try {
      const { error } = await supabase
        .from('avoid_list_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAvoidList(prev => prev.filter(item => item.id !== id));

      toast({
        title: "Account Removed",
        description: `${handle} has been removed from your avoid list`,
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove account",
        variant: "destructive",
      });
    }
  };

  const filteredList = avoidList.filter(item =>
    item.avoided_handle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.reason && item.reason.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!member) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading member data...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Avoid List Manager
        </h1>
        <p className="text-muted-foreground">
          Block specific accounts from supporting your tracks
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Accounts on your avoid list will be automatically excluded from supporting your submissions. 
          This helps you maintain control over who promotes your music.
        </AlertDescription>
      </Alert>

      {/* Stats & Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="px-3 py-1">
            {avoidList.length} Blocked Accounts
          </Badge>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search handles or reasons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Account
        </Button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Account to Avoid List
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="handle">SoundCloud Handle or URL *</Label>
                    <Input
                      id="handle"
                      placeholder="username or https://soundcloud.com/username"
                      value={newItem.handle}
                      onChange={(e) => setNewItem(prev => ({ ...prev, handle: e.target.value }))}
                      disabled={adding}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter just the username or the full SoundCloud URL
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      value="SoundCloud"
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason (Optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Why do you want to avoid this account? (private note)"
                    value={newItem.reason}
                    onChange={(e) => setNewItem(prev => ({ ...prev, reason: e.target.value }))}
                    disabled={adding}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddItem}
                    disabled={adding || !newItem.handle.trim()}
                  >
                    {adding ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Add to Avoid List
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewItem({ handle: '', platform: 'soundcloud', reason: '' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avoid List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Avoid List
            <Badge variant="outline">{filteredList.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              Loading avoid list...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              {searchTerm ? (
                <p>No accounts found matching "{searchTerm}"</p>
              ) : (
                <>
                  <p>Your avoid list is empty</p>
                  <p className="text-sm mt-2">Add accounts you don't want supporting your tracks</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredList.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{item.avoided_handle}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.platform}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              asChild
                              className="h-6 w-6 p-0"
                            >
                              <a
                                href={`https://soundcloud.com/${item.avoided_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                          {item.reason && (
                            <p className="text-sm text-muted-foreground">
                              {item.reason}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Added {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(item.id, item.avoided_handle)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <p>Add SoundCloud accounts you want to avoid by entering their handle or URL</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <p>When queue assignments are generated, these accounts will be automatically excluded</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <p>Your tracks will only be supported by accounts not on your avoid list</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <p>You can add or remove accounts at any time - changes apply to future submissions</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};