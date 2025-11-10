"use client"

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';
import { Save, X } from 'lucide-react';

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  patterns: string[];
  order_index: number;
  active: boolean;
}

interface GenreEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  genre: GenreFamily | Subgenre | null;
  type: 'family' | 'subgenre';
  selectedFamilyId?: string | null;
}

export const GenreEditModal: React.FC<GenreEditModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  genre,
  type,
  selectedFamilyId
}) => {
  const [families, setFamilies] = useState<GenreFamily[]>([]);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    active: true,
    patterns: [] as string[],
    order_index: 0,
    family_id: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === 'subgenre') {
      // Fetch families for dropdown
      const fetchFamilies = async () => {
        try {
          const { data, error } = await supabase
            .from('genre_families')
            .select('*')
            .order('name');
          
          if (error) throw error;
          setFamilies(data || []);
        } catch (error) {
          console.error('Error fetching families:', error);
        }
      };
      fetchFamilies();
    }
  }, [type]);

  useEffect(() => {
    if (genre) {
      setFormData({
        name: genre.name || '',
        active: genre.active ?? true,
        patterns: (genre as Subgenre).patterns || [],
        order_index: (genre as Subgenre).order_index || 0,
        family_id: (genre as Subgenre).family_id || selectedFamilyId || ''
      });
    } else {
      setFormData({
        name: '',
        active: true,
        patterns: [],
        order_index: 0,
        family_id: selectedFamilyId || ''
      });
    }
  }, [genre, selectedFamilyId]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (type === 'family') {
        if (genre) {
          // Update existing family
          const { error } = await supabase
            .from('genre_families')
            .update({
              name: formData.name.trim(),
              active: formData.active
            })
            .eq('id', genre.id);
          
          if (error) throw error;
          
          toast({
            title: "Success",
            description: "Genre family updated successfully"
          });
        } else {
          // Create new family
          const { error } = await supabase
            .from('genre_families')
            .insert({
              name: formData.name.trim(),
              active: formData.active
            });
          
          if (error) throw error;
          
          toast({
            title: "Success",
            description: "Genre family created successfully"
          });
        }
      } else {
        // Subgenre
        if (!formData.family_id) {
          toast({
            title: "Error",
            description: "Family is required for subgenres",
            variant: "destructive"
          });
          return;
        }

        if (genre) {
          // Update existing subgenre
          const { error } = await supabase
            .from('subgenres')
            .update({
              name: formData.name.trim(),
              active: formData.active,
              patterns: formData.patterns.filter(p => p.trim()),
              order_index: formData.order_index,
              family_id: formData.family_id
            })
            .eq('id', genre.id);
          
          if (error) throw error;
          
          toast({
            title: "Success",
            description: "Subgenre updated successfully"
          });
        } else {
          // Create new subgenre
          const { error } = await supabase
            .from('subgenres')
            .insert({
              name: formData.name.trim(),
              active: formData.active,
              patterns: formData.patterns.filter(p => p.trim()),
              order_index: formData.order_index,
              family_id: formData.family_id
            });
          
          if (error) throw error;
          
          toast({
            title: "Success",
            description: "Subgenre created successfully"
          });
        }
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save genre",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addPattern = () => {
    setFormData(prev => ({
      ...prev,
      patterns: [...prev.patterns, '']
    }));
  };

  const updatePattern = (index: number, value: string) => {
    const newPatterns = [...formData.patterns];
    newPatterns[index] = value;
    setFormData(prev => ({
      ...prev,
      patterns: newPatterns
    }));
  };

  const removePattern = (index: number) => {
    setFormData(prev => ({
      ...prev,
      patterns: prev.patterns.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {genre ? 'Edit' : 'Create'} {type === 'family' ? 'Genre Family' : 'Subgenre'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={`Enter ${type === 'family' ? 'family' : 'subgenre'} name`}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Active</Label>
          </div>

          {type === 'subgenre' && (
            <>
              <div>
                <Label htmlFor="family">Family</Label>
                <Select
                  value={formData.family_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, family_id: value }))}
                >
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select a family" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border shadow-xl z-50">
                    {families.map((family) => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="order_index">Order Index</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData(prev => ({ ...prev, order_index: parseInt(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Patterns</Label>
                <div className="space-y-2 mt-2">
                  {formData.patterns.map((pattern, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={pattern}
                        onChange={(e) => updatePattern(index, e.target.value)}
                        placeholder="Pattern"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePattern(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPattern}
                  >
                    Add Pattern
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};