'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Loader2, Music, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { SoundPostCard, type SoundPostCardPost } from '../components/SoundPostCard';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname.includes('artistinfluence')
    ? 'https://api.artistinfluence.com'
    : 'http://localhost:3001');

export default function PostsBySoundPage() {
  const [sound, setSound] = useState('');
  const [creator, setCreator] = useState('');
  const [posts, setPosts] = useState<SoundPostCardPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (sound.trim()) params.set('sound', sound.trim());
      if (creator.trim()) params.set('creator', creator.trim());
      const url = `${API_BASE_URL}/api/instagram-scraper/posts-by-sound?${params.toString()}`;
      const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success && data.data?.posts) {
        setPosts(data.data.posts);
      } else {
        setPosts([]);
      }
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/instagram/campaigns"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to Campaigns
            </Link>
            <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold px-3 py-1.5 rounded text-sm tracking-tight">
              ARTIST INFLUENCE
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Posts by Sound</h1>
          <p className="text-muted-foreground">
            Search Instagram posts by campaign name (sound) and/or creator (client). Results show scraped posts from matching campaigns.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Search
            </CardTitle>
            <CardDescription>
              Enter a sound (campaign name) and/or creator (client) to find posts. Leave both empty to see all posts (up to 100).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px] space-y-2">
                <Label htmlFor="sound">Sound (campaign name)</Label>
                <Input
                  id="sound"
                  placeholder="e.g. Feels Like Us"
                  value={sound}
                  onChange={(e) => setSound(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex-1 min-w-[180px] space-y-2">
                <Label htmlFor="creator">Creator (client)</Label>
                <Input
                  id="creator"
                  placeholder="e.g. Devault"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && searched && posts.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No posts found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Try different search terms, or make sure campaigns have been scraped (Refresh Data on campaign analytics). Add an Instagram URL to campaigns so posts can be collected.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && posts.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {posts.length} post{posts.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {posts.map((post) => (
                <SoundPostCard key={post.id} post={post} />
              ))}
            </div>
          </>
        )}

        {!loading && !searched && (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <p>Enter a sound and/or creator above and click Search to see posts.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
