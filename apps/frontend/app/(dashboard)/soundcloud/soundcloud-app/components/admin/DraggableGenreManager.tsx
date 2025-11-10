"use client"

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../../hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Edit, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GenreEditModal } from './GenreEditModal';

interface GenreFamily {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface Subgenre {
  id: string;
  name: string;
  family_id: string;
  patterns: string[];
  order_index: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface DraggableGenreManagerProps {
  onGenreFamilyEdit: (family: GenreFamily) => void;
  onSubgenreEdit: (subgenre: Subgenre) => void;
  onGenreFamilyDelete: (id: string) => void;
  onSubgenreDelete: (id: string) => void;
  onGenreFamilyAdd: () => void;
  onSubgenreAdd: (familyId: string) => void;
}

export const DraggableGenreManager: React.FC<DraggableGenreManagerProps> = ({
  onGenreFamilyEdit,
  onSubgenreEdit,
  onGenreFamilyDelete,
  onSubgenreDelete,
  onGenreFamilyAdd,
  onSubgenreAdd,
}) => {
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [subgenres, setSubgenres] = useState<Subgenre[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGenre, setEditingGenre] = useState<GenreFamily | Subgenre | null>(null);
  const [editingType, setEditingType] = useState<'family' | 'subgenre'>('family');
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [familiesResponse, subgenresResponse] = await Promise.all([
        supabase.from('genre_families').select('*').order('name'),
        supabase.from('subgenres').select('*').order('order_index')
      ]);

      if (familiesResponse.error) throw familiesResponse.error;
      if (subgenresResponse.error) throw subgenresResponse.error;

      setGenreFamilies(familiesResponse.data || []);
      setSubgenres(subgenresResponse.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch genre data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId, type } = result;

    if (type === 'FAMILY') {
      // Reordering genre families
      const newFamilies = Array.from(genreFamilies);
      const [reorderedFamily] = newFamilies.splice(source.index, 1);
      newFamilies.splice(destination.index, 0, reorderedFamily);

      setGenreFamilies(newFamilies);

      // Simple reorder - no order_index in genre_families table
      try {
        // Just update the UI state for now
        // In a real implementation, you might want to add order_index to genre_families
        toast({
          title: "Success",
          description: "Genre family order updated",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update family order",
          variant: "destructive",
        });
        fetchData(); // Revert on error
      }
    } else if (type === 'SUBGENRE') {
      // Moving subgenre between families
      const sourceFamily = source.droppableId;
      const destinationFamily = destination.droppableId;
      const subgenreId = draggableId;

      if (sourceFamily !== destinationFamily) {
        // Moving to different family
        const updatedSubgenres = subgenres.map(sub =>
          sub.id === subgenreId 
            ? { ...sub, family_id: destinationFamily }
            : sub
        );

        setSubgenres(updatedSubgenres);

        try {
          await supabase
            .from('subgenres')
            .update({ family_id: destinationFamily })
            .eq('id', subgenreId);

          toast({
            title: "Success",
            description: "Subgenre moved to new family",
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to move subgenre",
            variant: "destructive",
          });
          fetchData(); // Revert on error
        }
      }
    }
  };

  const getSubgenresForFamily = (familyId: string) => {
    return subgenres.filter(sub => sub.family_id === familyId);
  };

  const handleEditGenreFamily = (family: GenreFamily) => {
    setEditingGenre(family);
    setEditingType('family');
    setEditModalOpen(true);
  };

  const handleEditSubgenre = (subgenre: Subgenre) => {
    setEditingGenre(subgenre);
    setEditingType('subgenre');
    setEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setEditingGenre(null);
  };

  const handleEditSuccess = () => {
    fetchData();
  };

  const handleAddGenreFamily = () => {
    setEditingGenre(null);
    setEditingType('family');
    setSelectedFamilyId(null);
    setEditModalOpen(true);
  };

  const handleAddSubgenre = (familyId: string) => {
    setEditingGenre(null);
    setEditingType('subgenre');
    setSelectedFamilyId(familyId);
    setEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Family Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-muted-foreground">Genre Families</h3>
        <Button
          onClick={handleAddGenreFamily}
          variant="outline"
          size="sm"
          className="bg-background border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/5"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Family
        </Button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="families" type="FAMILY">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-4 transition-colors duration-200 ${
                snapshot.isDraggingOver ? 'bg-accent/20 rounded-lg p-2' : ''
              }`}
            >
            <AnimatePresence>
              {genreFamilies.map((family, index) => (
                <Draggable key={family.id} draggableId={family.id} index={index}>
                  {(provided, snapshot) => (
                    <motion.div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-transform duration-200 ${
                        snapshot.isDragging ? 'rotate-2 scale-105' : ''
                      }`}
                    >
                      <Card className={`border-2 transition-all duration-200 ${
                        snapshot.isDragging 
                          ? 'border-primary shadow-lg bg-card/95' 
                          : 'border-border hover:border-primary/50'
                      }`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                {...provided.dragHandleProps}
                                className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-accent transition-colors"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <CardTitle className="text-lg">{family.name}</CardTitle>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGenreFamily(family)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onGenreFamilyDelete(family.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Droppable droppableId={family.id} type="SUBGENRE">
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`min-h-[60px] rounded-lg border-2 border-dashed transition-all duration-200 ${
                                  snapshot.isDraggingOver
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/20'
                                }`}
                              >
                                <div className="p-3 space-y-2">
                                  <AnimatePresence>
                                    {getSubgenresForFamily(family.id).map((subgenre, subIndex) => (
                                      <Draggable
                                        key={subgenre.id}
                                        draggableId={subgenre.id}
                                        index={subIndex}
                                      >
                                        {(provided, snapshot) => (
                                          <motion.div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.15 }}
                                            className={`group flex items-center justify-between p-2 rounded-md border cursor-grab hover:cursor-grabbing transition-all duration-200 ${
                                              snapshot.isDragging
                                                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                                                : 'bg-background hover:bg-accent'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span className="text-sm font-medium">{subgenre.name}</span>
                                              <Badge 
                                                variant={subgenre.active ? "default" : "secondary"}
                                                className="text-xs"
                                              >
                                                {subgenre.active ? 'Active' : 'Inactive'}
                                              </Badge>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                 onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleEditSubgenre(subgenre);
                                                 }}
                                                className="h-6 w-6 p-0"
                                              >
                                                <Edit className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onSubgenreDelete(subgenre.id);
                                                }}
                                                className="h-6 w-6 p-0"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </Draggable>
                                    ))}
                                  </AnimatePresence>
                                   {provided.placeholder}
                                   {getSubgenresForFamily(family.id).length === 0 && (
                                     <div className="text-center text-muted-foreground py-4">
                                       <div>Drop subgenres here or create new ones</div>
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleAddSubgenre(family.id)}
                                         className="mt-2 text-xs border-2 border-dashed border-muted-foreground/30 hover:border-primary"
                                       >
                                         <Plus className="h-3 w-3 mr-1" />
                                         Add Subgenre
                                       </Button>
                                     </div>
                                   )}
                                   {getSubgenresForFamily(family.id).length > 0 && (
                                     <div className="flex justify-center pt-2">
                                       <Button
                                         variant="ghost"
                                         size="sm"
                                         onClick={() => handleAddSubgenre(family.id)}
                                         className="text-xs border-2 border-dashed border-muted-foreground/30 hover:border-primary"
                                       >
                                         <Plus className="h-3 w-3 mr-1" />
                                         Add Subgenre
                                       </Button>
                                     </div>
                                   )}
                                 </div>
                              </div>
                            )}
                          </Droppable>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </Draggable>
              ))}
            </AnimatePresence>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        
        <GenreEditModal
          isOpen={editModalOpen}
          onClose={handleEditModalClose}
          onSuccess={handleEditSuccess}
          genre={editingGenre}
          type={editingType}
          selectedFamilyId={selectedFamilyId}
        />
      </DragDropContext>
    </div>
  );
};