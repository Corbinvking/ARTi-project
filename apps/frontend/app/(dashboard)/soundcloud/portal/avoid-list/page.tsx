"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMyMember } from "../../soundcloud-app/hooks/useMyMember";
import { supabase } from "../../soundcloud-app/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield,
  Plus,
  Trash2,
  Search,
  User,
  AlertCircle,
  Loader2
} from "lucide-react";

interface AvoidListItem {
  id: string;
  member_id: string;
  avoided_member_id?: string;
  avoided_member_name?: string;
  reason?: string;
  created_at: string;
}

export default function AvoidListPage() {
  const { data: member, isLoading: memberLoading } = useMyMember();
  const { toast } = useToast();
  
  const [avoidList, setAvoidList] = useState<AvoidListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchAvoidList = async () => {
    if (!member?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('soundcloud_avoid_list_items')
        .select(`
          *,
          avoided_member:soundcloud_members!avoided_member_id(name)
        `)
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.warn('Avoid list fetch error:', error);
        setAvoidList([]);
        return;
      }

      setAvoidList(data?.map(item => ({
        ...item,
        avoided_member_name: item.avoided_member?.name || item.avoided_member_name || 'Unknown'
      })) || []);
    } catch (error) {
      console.error('Error fetching avoid list:', error);
      setAvoidList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (member?.id) {
      fetchAvoidList();
    }
  }, [member?.id]);

  const handleAddToAvoidList = async () => {
    if (!member?.id || !newMemberName.trim()) return;

    setIsAdding(true);
    try {
      // First, try to find the member by name
      const { data: foundMembers, error: searchError } = await supabase
        .from('soundcloud_members')
        .select('id, name')
        .ilike('name', `%${newMemberName.trim()}%`)
        .neq('id', member.id)
        .limit(1);

      let avoidedMemberId = foundMembers?.[0]?.id;
      let avoidedMemberName = foundMembers?.[0]?.name || newMemberName.trim();

      // Insert into avoid list
      const { error } = await supabase
        .from('soundcloud_avoid_list_items')
        .insert({
          member_id: member.id,
          avoided_member_id: avoidedMemberId || null,
          avoided_member_name: avoidedMemberName,
        });

      if (error) throw error;

      toast({
        title: "Added to Avoid List",
        description: `${avoidedMemberName} has been added to your avoid list.`,
      });

      setNewMemberName("");
      fetchAvoidList();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to avoid list",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFromAvoidList = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('soundcloud_avoid_list_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast({
        title: "Removed",
        description: "Member removed from your avoid list.",
      });

      fetchAvoidList();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from avoid list",
        variant: "destructive",
      });
    }
  };

  const filteredList = avoidList.filter(item =>
    item.avoided_member_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (memberLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Avoid List</h1>
        <p className="text-muted-foreground">
          Manage members you don't want to be assigned to support
        </p>
      </div>

      {/* Info Card */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">How the Avoid List Works</p>
              <p className="mt-1">
                Members on your avoid list won't be assigned to your support queue.
                Use this for members with conflicting content or personal preferences.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add to Avoid List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add to Avoid List
          </CardTitle>
          <CardDescription>
            Enter a member name to add to your avoid list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Member name..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddToAvoidList();
              }}
            />
            <Button 
              onClick={handleAddToAvoidList} 
              disabled={isAdding || !newMemberName.trim()}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Avoid List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Your Avoid List
              </CardTitle>
              <CardDescription>
                {avoidList.length} member{avoidList.length !== 1 ? 's' : ''} on your avoid list
              </CardDescription>
            </div>
            {avoidList.length > 0 && (
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {filteredList.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {avoidList.length === 0 ? "No One on Your Avoid List" : "No Results Found"}
              </h3>
              <p className="text-muted-foreground">
                {avoidList.length === 0 
                  ? "Add members you'd prefer not to support"
                  : "Try a different search term"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.avoided_member_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Added {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFromAvoidList(item.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

