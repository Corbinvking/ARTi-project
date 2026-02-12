"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { Loader2, Music, RefreshCw, X } from "lucide-react";

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
      if (!res.ok) throw new Error("Failed to load members");
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
        ) : members.length === 0 ? (
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
                  {genreFamilies.some((f) => !(assignments[member.user_id] || []).includes(f.id)) && (
                    <Select
                      key={`${member.user_id}-${(assignments[member.user_id] || []).length}`}
                      value=""
                      onValueChange={(value) => {
                        if (value) handleGenreAdd(member.user_id, value);
                      }}
                      disabled={!!savingId}
                    >
                      <SelectTrigger className="w-[140px] h-8">
                        <SelectValue placeholder="Add genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {genreFamilies
                          .filter((f) => !(assignments[member.user_id] || []).includes(f.id))
                          .map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {savingId === member.user_id && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
