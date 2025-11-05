import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StickyNote, Plus, Search, Filter, AlertTriangle, Lightbulb, Bug, TrendingUp, Calendar } from 'lucide-react';
import { useWorkflowAutomation, AnalyticsNote } from '../hooks/useWorkflowAutomation';
import { format } from 'date-fns';

interface AnalyticsNotesManagerProps {
  campaignId?: string;
  creatorId?: string;
}

const noteTypeIcons = {
  general: StickyNote,
  performance: TrendingUp,
  issue: Bug,
  insight: Lightbulb,
  follow_up: Calendar
};

const noteTypeColors = {
  general: 'default',
  performance: 'secondary',
  issue: 'destructive',
  insight: 'default',
  follow_up: 'outline'
} as const;

const priorityColors = {
  low: 'outline',
  medium: 'secondary',
  high: 'default',
  urgent: 'destructive'
} as const;

export const AnalyticsNotesManager: React.FC<AnalyticsNotesManagerProps> = ({ 
  campaignId, 
  creatorId 
}) => {
  const { analyticsNotes, createAnalyticsNote, loadAnalyticsNotes } = useWorkflowAutomation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    note_type: 'general' as AnalyticsNote['note_type'],
    priority: 'medium' as AnalyticsNote['priority'],
    tags: [] as string[]
  });

  useEffect(() => {
    loadAnalyticsNotes(campaignId, creatorId);
  }, [loadAnalyticsNotes, campaignId, creatorId]);

  const handleCreateNote = async () => {
    try {
      await createAnalyticsNote({
        ...formData,
        campaign_id: campaignId,
        creator_id: creatorId
      });
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        note_type: 'general',
        priority: 'medium',
        tags: []
      });
      
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const filteredNotes = analyticsNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || note.note_type === filterType;
    const matchesPriority = filterPriority === 'all' || note.priority === filterPriority;
    
    return matchesSearch && matchesType && matchesPriority;
  });

  const NoteCard: React.FC<{ note: AnalyticsNote }> = ({ note }) => {
    const IconComponent = noteTypeIcons[note.note_type];
    
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <IconComponent className="h-4 w-4" />
              <CardTitle className="text-base">{note.title}</CardTitle>
            </div>
            <div className="flex space-x-2">
              <Badge variant={priorityColors[note.priority]}>
                {note.priority}
              </Badge>
              <Badge variant={noteTypeColors[note.note_type]}>
                {note.note_type}
              </Badge>
            </div>
          </div>
          <CardDescription>
            {format(new Date(note.created_at), 'MMM dd, yyyy - HH:mm')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{note.content}</p>
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Analytics Notes</h3>
          <p className="text-sm text-muted-foreground">
            Track insights, issues, and follow-ups
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Analytics Note</DialogTitle>
              <DialogDescription>
                Add insights, track issues, or note important observations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Brief title for this note"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="note-type">Type</Label>
                  <Select
                    value={formData.note_type}
                    onValueChange={(value: AnalyticsNote['note_type']) => 
                      setFormData({ ...formData, note_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="issue">Issue</SelectItem>
                      <SelectItem value="insight">Insight</SelectItem>
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="note-priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: AnalyticsNote['priority']) => 
                      setFormData({ ...formData, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="note-content">Content</Label>
                <Textarea
                  id="note-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Detailed note content..."
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="note-tags">Tags</Label>
                <Input
                  id="note-tags"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="Add tags separated by commas..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateNote}
                  disabled={!formData.title || !formData.content}
                >
                  Create Note
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
            <SelectItem value="insight">Insight</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes List */}
      <ScrollArea className="h-96">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-8">
            <StickyNote className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No notes yet</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' || filterPriority !== 'all' 
                ? 'No notes match your current filters'
                : 'Start by creating your first analytics note'
              }
            </p>
          </div>
        ) : (
          <div>
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};