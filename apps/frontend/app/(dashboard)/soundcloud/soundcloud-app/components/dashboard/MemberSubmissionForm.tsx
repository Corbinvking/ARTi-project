"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { CalendarIcon, Music, AlertTriangle, Check, ChevronsUpDown } from "lucide-react";
import { format, addDays, isAfter } from "date-fns";
import { cn } from "../../lib/utils";
import { supabase } from "../../integrations/supabase/client";
import { useToast } from "../../hooks/use-toast";

interface Member {
  id: string;
  name: string;
  stage_name: string;
  primary_email: string;
  emails: string[];
  influence_planner_status: string;
}

interface MemberSubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function MemberSubmissionForm({ open, onOpenChange, onSuccess }: MemberSubmissionFormProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    first_name: "",
    stage_name: "",
    member_id: "",
    primary_email: "",
    secondary_email: "",
    group: "",
    song_name: "",
    date_requested: undefined as Date | undefined,
    release_date: undefined as Date | undefined,
    track_url: "",
  });

  // Fetch members for search
  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, name, stage_name, primary_email, emails, influence_planner_status')
        .order('stage_name');

      if (error) throw error;
      setMembers(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch members",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    if (member) {
      // Check if member is disconnected
      if (member.influence_planner_status === 'disconnected') {
        toast({
          title: "Reconnection Required",
          description: (
            <div className="space-y-2">
              <p>You need to reconnect to Influence Planner before submitting.</p>
              <div className="flex flex-col gap-1 text-sm">
                <a 
                  href="https://influenceplanner.com/user/invite/artistinfluence" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  👉 Reconnect Now
                </a>
                <p>If you think this is an error, contact: <span className="text-primary">katt@artistinfluence.com</span></p>
              </div>
            </div>
          ),
          variant: "destructive",
          duration: 10000,
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        member_id: memberId,
        stage_name: member.stage_name || member.name,
        primary_email: member.primary_email,
        // Extract first name from full name
        first_name: (member.name || '').split(' ')[0] || '',
      }));
    }
  };

  const validateForm = () => {
    // Check if selected member is disconnected
    const selectedMember = members.find(m => m.id === formData.member_id);
    if (selectedMember?.influence_planner_status === 'disconnected') {
      toast({
        title: "Reconnection Required",
        description: "Please reconnect to Influence Planner before submitting.",
        variant: "destructive",
      });
      return false;
    }

    // Check minimum 2 week notice
    if (formData.date_requested && !isAfter(formData.date_requested, addDays(new Date(), 13))) {
      toast({
        title: "Date Error",
        description: "Please submit your music 2-3 weeks prior to your desired support date (minimum 2 weeks).",
        variant: "destructive",
      });
      return false;
    }

    // Basic URL validation for SoundCloud
    if (formData.track_url && !formData.track_url.includes('soundcloud.com')) {
      toast({
        title: "URL Error", 
        description: "Please provide a SoundCloud URL for your track.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const submissionData = {
        member_id: formData.member_id,
        track_url: formData.track_url,
        artist_name: formData.stage_name,
        track_name: formData.song_name,
        support_date: formData.date_requested?.toISOString().split('T')[0] || null,
        release_date: formData.release_date?.toISOString().split('T')[0] || null,
        secondary_email: formData.secondary_email || null,
        family: formData.group || null,
        status: 'new' as const,
      };

      const { error } = await supabase
        .from('submissions')
        .insert([submissionData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Track submission submitted successfully! You will receive a confirmation email shortly.",
      });

      // Reset form
      setFormData({
        first_name: "",
        stage_name: "",
        member_id: "",
        primary_email: "",
        secondary_email: "",
        group: "",
        song_name: "",
        date_requested: undefined,
        release_date: undefined,
        track_url: "",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit track",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Member Track Submission
          </DialogTitle>
        </DialogHeader>

        {/* Guidelines */}
        <div className="bg-muted/30 p-4 rounded-lg border border-muted space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Not Supported:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Mixes longer than 30 minutes</li>
                <li>Sample pack previews (a full demo track is required for it to be considered a song)</li>
                <li>Podcasts</li>
                <li>Playlists with two or more songs (unless it's an EP)</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Additional Guidelines:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Only original music or remixes from member projects are permitted.</li>
              <li>Back-catalog submissions are not accepted.</li>
              <li>Please submit your music 2–3 weeks prior to your desired support date. Support is offered on a first-come, first-served basis.</li>
              <li>If you do not submit a minimum of 2 weeks prior, support can be anticipated two weeks from submission date.</li>
              <li>For artists under the same management or label, there must be at least a 5-day interval between supports for the same member.</li>
              <li>Non-compliance with these guidelines may result in penalties or removal from the group.</li>
            </ul>
          </div>

          <div className="border-t pt-3">
            <p className="text-sm font-medium text-foreground mb-1">Support Follow-Up:</p>
            <p className="text-sm text-muted-foreground">
              If you do not receive support within 5-7 BUSINESS DAYS of your confirmed support date, please contact: 
              <span className="font-medium text-primary"> katt@artistinfluence.com</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Thank you for being a part of this empowering community!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange("first_name", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="stage_name">Stage Name</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between"
                    >
                      {formData.stage_name || "Search and select stage name..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search by stage name..." />
                      <CommandList className="max-h-60 overflow-y-auto">
                        <CommandEmpty>No member found.</CommandEmpty>
                        <CommandGroup>
                          {members.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={member.stage_name || member.name}
                              onSelect={() => {
                                handleMemberSelect(member.id);
                                setSearchOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.member_id === member.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">{member.stage_name || member.name}</div>
                                <div className="text-sm text-muted-foreground">{member.primary_email}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => handleInputChange("primary_email", e.target.value)}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground mt-1">Auto-filled from member selection</p>
              </div>

              <div>
                <Label htmlFor="secondary_email">Secondary Email (Optional)</Label>
                <Input
                  id="secondary_email"
                  type="email" 
                  value={formData.secondary_email}
                  onChange={(e) => handleInputChange("secondary_email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Track Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Track Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group">Group (Genre)</Label>
                <Select value={formData.group} onValueChange={(value) => handleInputChange("group", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select genre group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronic">Electronic</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="techno">Techno</SelectItem>
                    <SelectItem value="dubstep">Dubstep</SelectItem>
                    <SelectItem value="trance">Trance</SelectItem>
                    <SelectItem value="ambient">Ambient</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="song_name">Song Name</Label>
                <Input
                  id="song_name"
                  value={formData.song_name}
                  onChange={(e) => handleInputChange("song_name", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="track_url">URL (SoundCloud)</Label>
              <Input
                id="track_url"
                type="url"
                value={formData.track_url}
                onChange={(e) => handleInputChange("track_url", e.target.value)}
                placeholder="https://soundcloud.com/artist/track"
                required
              />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Dates</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date Requested (for support)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date_requested && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date_requested ? format(formData.date_requested, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date_requested}
                      onSelect={(date) => handleInputChange("date_requested", date)}
                      initialFocus
                      disabled={(date) => isAfter(new Date(), addDays(date, -14))}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-1">Minimum 2 weeks from today</p>
              </div>

              <div>
                <Label>Release Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.release_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.release_date ? format(formData.release_date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.release_date}
                      onSelect={(date) => handleInputChange("release_date", date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Track"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}