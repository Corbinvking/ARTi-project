"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../../hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Music, RefreshCw, X } from "lucide-react";

const CREATE_GENRE_SENTINEL = "__create__";

interface IPNetworkMember {
  user_id: string;
  name: string;
  followers: number;
  image_url?: string;
  profile_url?: string;
  status?: string;
}

interface GenreFamily {
  id: string;
  name: string;
}

interface RepostChannelGenresCardProps {
  sessionToken: string | null;
}

const MEMBERS_PAGE_SIZE = 200;

export function RepostChannelGenresCard({ sessionToken }: RepostChannelGenresCardProps) {
  const [members, setMembers] = useState<IPNetworkMember[]>([]);
  const [genreFamilies, setGenreFamilies] = useState<GenreFamily[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createGenreOpen, setCreateGenreOpen] = useState(false);
  const [createGenreForMemberId, setCreateGenreForMemberId] = useState<string | null>(null);
  const [newGenreName, setNewGenreName] = useState("");
  const [creatingGenre, setCreatingGenre] = useState(false);
  const [deleteGenreTarget, setDeleteGenreTarget] = useState<GenreFamily | null>(null);
  const [deletingGenre, setDeletingGenre] = useState(false);
  const { toast } = useToast();

  const fetchGenreFamilies = useCallback(async () => {
    // Use server API so genre list is not blocked by RLS and both tables are merged
    if (!sessionToken) {
      setGenreFamilies([]);
      return;
    }
    try {
      const res = await fetch("/api/soundcloud/genre-families", {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!res.ok) throw new Error("Failed to load genres");
      const data = await res.json();
      setGenreFamilies(Array.isArray(data) ? data : []);
    } catch {
      setGenreFamilies([]);
    }
  }, [sessionToken]);

  const fetchAssignments = useCallback(async () => {
    if (!sessionToken) return;
    const res = await fetch("/api/soundcloud/repost-channel-genres", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) throw new Error("Failed to load genre assignments");
    const list: { ip_user_id: string; genre_family_id: string }[] = await res.json();
    const map: Record<string, string[]> = {};
    list.forEach((item) => {
      if (!map[item.ip_user_id]) map[item.ip_user_id] = [];
      map[item.ip_user_id].push(item.genre_family_id);
    });
    setAssignments(map);
  }, [sessionToken]);

  const fetchMembers = useCallback(async () => {
    if (!sessionToken) return;
    const all: IPNetworkMember[] = [];
    let offset = 0;
    const limit = MEMBERS_PAGE_SIZE;
    let hasMore = true;
    while (hasMore) {
      const res = await fetch(
        `/api/soundcloud/influenceplanner/members?limit=${limit}&offset=${offset}&sortBy=FOLLOWERS&sortDir=DESC`,
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        if (errBody?.source === "influenceplanner") {
          throw new Error(
            errBody.error || "InfluencePlanner API credentials are invalid. Update them in Settings."
          );
        }
        throw new Error(errBody?.error || "Failed to load members");
      }
      const data = await res.json();
      const results = data?.body?.results ?? [];
      results.forEach((m: any) => all.push({
        user_id: m.user_id,
        name: m.name ?? "",
        followers: m.followers ?? 0,
        image_url: m.image_url,
        profile_url: m.profile_url,
        status: m.status,
      }));
      hasMore = !data?.body?.last && results.length === limit;
      offset += limit;
      if (all.length >= 500) break;
    }
    setMembers(all);
  }, [sessionToken]);

  const load = useCallback(async () => {
    if (!sessionToken) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await Promise.all([fetchGenreFamilies(), fetchAssignments(), fetchMembers()]);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to load repost channel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionToken, fetchGenreFamilies, fetchAssignments, fetchMembers, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenreRemove = async (ipUserId: string, genreFamilyId: string) => {
    if (!sessionToken) return;
    setSavingId(ipUserId);
    try {
      const res = await fetch("/api/soundcloud/repost-channel-genres", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ ip_user_id: ipUserId, genre_family_id: genreFamilyId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to remove");
      }
      setAssignments((prev) => ({
        ...prev,
        [ipUserId]: (prev[ipUserId] || []).filter((id) => id !== genreFamilyId),
      }));
      toast({ title: "Removed", description: "Genre tag removed." });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to remove genre",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleGenreAdd = async (ipUserId: string, genreFamilyId: string) => {
    if (!sessionToken) return;
    setSavingId(ipUserId);
    try {
      const res = await fetch("/api/soundcloud/repost-channel-genres", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ ip_user_id: ipUserId, genre_family_id: genreFamilyId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to save");
      }
      setAssignments((prev) => ({
        ...prev,
        [ipUserId]: [...(prev[ipUserId] || []), genreFamilyId],
      }));
      toast({ title: "Added", description: "Genre tag added." });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to save genre",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateGenreSubmit = async () => {
    const name = newGenreName.trim();
    if (!name || !sessionToken) return;
    setCreatingGenre(true);
    try {
      const res = await fetch("/api/soundcloud/genre-families", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && data?.error?.toLowerCase().includes("already")) {
          toast({ title: "Genre already exists", description: data.error, variant: "destructive" });
        } else {
          toast({
            title: "Error",
            description: data?.error || "Failed to create genre",
            variant: "destructive",
          });
        }
        return;
      }
      const { id, name: createdName } = data as { id: string; name: string };
      await fetchGenreFamilies();
      setCreateGenreOpen(false);
      setCreateGenreForMemberId(null);
      setNewGenreName("");
      if (createGenreForMemberId) {
        await handleGenreAdd(createGenreForMemberId, id);
      }
      toast({ title: "Created", description: `Genre "${createdName}" added and available for all channels.` });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to create genre",
        variant: "destructive",
      });
    } finally {
      setCreatingGenre(false);
    }
  };

  const openCreateGenreDialog = (memberUserId: string) => {
    setCreateGenreForMemberId(memberUserId);
    setCreateGenreOpen(true);
    setNewGenreName("");
  };

  const handleGenreDelete = async () => {
    if (!deleteGenreTarget || !sessionToken) return;
    setDeletingGenre(true);
    try {
      const res = await fetch("/api/soundcloud/genre-families", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ id: deleteGenreTarget.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete genre");
      }
      const deletedId = deleteGenreTarget.id;
      setGenreFamilies((prev) => prev.filter((f) => f.id !== deletedId));
      setAssignments((prev) => {
        const next: Record<string, string[]> = {};
        for (const [userId, ids] of Object.entries(prev)) {
          const filtered = ids.filter((id) => id !== deletedId);
          if (filtered.length > 0) next[userId] = filtered;
        }
        return next;
      });
      toast({ title: "Deleted", description: `Genre "${deleteGenreTarget.name}" deleted.` });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to delete genre",
        variant: "destructive",
      });
    } finally {
      setDeletingGenre(false);
      setDeleteGenreTarget(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            <div>
              <CardTitle>Repost Channel Genres</CardTitle>
              <CardDescription>
                Tag Influence Planner repost channels with a genre. These tags appear when loading channels for scheduling.
              </CardDescription>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading || !sessionToken}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!sessionToken ? (
          <p className="text-sm text-muted-foreground">Sign in to load repost channels.</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visible list of available genres */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Available genres</p>
              {genreFamilies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No genres yet. Use &quot;Add genre&quot; on any channel below and choose &quot;Create new genre...&quot; to add the first.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {genreFamilies.map((f) => (
                    <Badge key={f.id} variant="outline" className="font-normal pr-1 gap-1">
                      {f.name}
                      <button
                        type="button"
                        onClick={() => setDeleteGenreTarget(f)}
                        className="rounded-full hover:bg-destructive/20 p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Delete genre ${f.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">No repost channel members found. Check Influence Planner connection.</p>
            ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-2">
            {members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-4 rounded-lg border p-3"
              >
                {member.image_url ? (
                  <img
                    src={member.image_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.followers.toLocaleString()} followers
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(assignments[member.user_id] || []).map((genreId) => {
                    const family = genreFamilies.find((f) => f.id === genreId);
                    return (
                      <Badge
                        key={genreId}
                        variant="secondary"
                        className="text-xs font-normal pr-1 gap-1"
                      >
                        {family?.name ?? genreId}
                        <button
                          type="button"
                          onClick={() => handleGenreRemove(member.user_id, genreId)}
                          disabled={!!savingId}
                          className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                          aria-label="Remove genre"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  <Select
                    key={`${member.user_id}-${(assignments[member.user_id] || []).length}`}
                    value={createGenreForMemberId === member.user_id ? "" : undefined}
                    onValueChange={(value) => {
                      if (value === CREATE_GENRE_SENTINEL) {
                        openCreateGenreDialog(member.user_id);
                        return;
                      }
                      if (value) handleGenreAdd(member.user_id, value);
                    }}
                    disabled={!!savingId}
                  >
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Add genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CREATE_GENRE_SENTINEL}>
                        Create new genre...
                      </SelectItem>
                      {genreFamilies
                        .filter((f) => !(assignments[member.user_id] || []).includes(f.id))
                        .map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                {savingId === member.user_id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
            )}
          </div>
        )}
      </CardContent>
      <Dialog open={createGenreOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateGenreOpen(false);
          setCreateGenreForMemberId(null);
          setNewGenreName("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New genre</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-genre-name">Genre name</Label>
              <Input
                id="new-genre-name"
                value={newGenreName}
                onChange={(e) => setNewGenreName(e.target.value)}
                placeholder="e.g. Future Bass"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateGenreSubmit();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              onClick={handleCreateGenreSubmit}
              disabled={!newGenreName.trim() || creatingGenre}
            >
              {creatingGenre ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteGenreTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteGenreTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete genre</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteGenreTarget?.name}&quot;? This will also
              remove it from all channels that currently use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingGenre}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenreDelete}
              disabled={deletingGenre}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingGenre ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
