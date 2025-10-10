"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Search, Sparkles, Database, AlertCircle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Progress } from "./ui/progress"
import { Alert, AlertDescription } from "./ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Separator } from "./ui/separator"

interface SearchResult {
  id: string
  name: string
  client: string
  track_name: string
  status: string
  stream_goal: number
  similarity: number
  search_content: string
  music_genres: string[]
  territory_preferences: string[]
  notes?: string
}

interface AISearchProps {
  onCampaignSelect?: (campaign: SearchResult) => void
  className?: string
}

export function AISearch({ onCampaignSelect, className }: AISearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("search")
  const [searchThreshold, setSearchThreshold] = useState(0.7)
  const queryClient = useQueryClient()

  // Search for similar campaigns
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await fetch('/api/insights/ai-search/similar-campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          contentType: 'campaign',
          threshold: searchThreshold,
          maxResults: 20,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to search campaigns')
      }

      return response.json()
    },
    onSuccess: (data) => {
      console.log('Search results:', data)
    },
  })

  // Generate embeddings for all campaigns
  const generateEmbeddingsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/insights/ai-search/generate-all-embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentType: 'campaign',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate embeddings')
      }

      return response.json()
    },
    onSuccess: () => {
      // Refresh search results after embedding generation
      if (searchQuery.trim()) {
        searchMutation.mutate(searchQuery)
      }
    },
  })

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery)
    }
  }, [searchQuery, searchMutation])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleCampaignSelect = (campaign: SearchResult) => {
    onCampaignSelect?.(campaign)
  }

  const formatSimilarity = (similarity: number) => {
    return `${Math.round(similarity * 100)}% match`
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            AI-Powered Campaign Search
          </CardTitle>
          <CardDescription>
            Search campaigns using natural language and AI similarity matching
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Smart Search</TabsTrigger>
              <TabsTrigger value="embeddings">Embeddings</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Describe the campaign you're looking for..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={searchMutation.isPending}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Similarity Threshold:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={searchThreshold}
                    onChange={(e) => setSearchThreshold(parseFloat(e.target.value))}
                    className="w-20"
                  />
                  <span>{Math.round(searchThreshold * 100)}%</span>
                </div>
              </div>

              {searchMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 animate-spin" />
                  Searching campaigns...
                </div>
              )}

              {searchMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to search campaigns. Please try again.
                  </AlertDescription>
                </Alert>
              )}

              {searchMutation.data?.results && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      Found {searchMutation.data.total} similar campaigns
                    </h3>
                    <Badge variant="outline">
                      Query: "{searchQuery}"
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {searchMutation.data.results.map((campaign: SearchResult) => (
                      <Card
                        key={campaign.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleCampaignSelect(campaign)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-medium">{campaign.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {campaign.client} • {campaign.track_name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status}
                              </Badge>
                              <Badge variant="outline">
                                {formatSimilarity(campaign.similarity)}
                              </Badge>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground mb-2">
                            Stream Goal: {campaign.stream_goal?.toLocaleString() || 'N/A'}
                          </div>

                          {campaign.music_genres && campaign.music_genres.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {campaign.music_genres.slice(0, 3).map((genre) => (
                                <Badge key={genre} variant="secondary" className="text-xs">
                                  {genre}
                                </Badge>
                              ))}
                              {campaign.music_genres.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{campaign.music_genres.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {campaign.search_content}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="embeddings" className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Generate vector embeddings for all campaigns to enable AI-powered search.
                  This process analyzes campaign content and creates searchable representations.
                </AlertDescription>
              </Alert>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Generate Campaign Embeddings</h3>
                  <p className="text-sm text-muted-foreground">
                    Process all campaigns to enable semantic search
                  </p>
                </div>
                <Button
                  onClick={() => generateEmbeddingsMutation.mutate()}
                  disabled={generateEmbeddingsMutation.isPending}
                >
                  {generateEmbeddingsMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Embeddings
                    </>
                  )}
                </Button>
              </div>

              {generateEmbeddingsMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 animate-spin" />
                    Generating embeddings for all campaigns...
                  </div>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}

              {generateEmbeddingsMutation.isSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Successfully generated embeddings for all campaigns! You can now use AI-powered search.
                  </AlertDescription>
                </Alert>
              )}

              {generateEmbeddingsMutation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to generate embeddings. Please check your OpenAI API key configuration.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          <Separator />

          <div className="text-xs text-muted-foreground">
            <p className="mb-2">
              <strong>How it works:</strong> AI search uses vector embeddings to find campaigns
              that are semantically similar to your query, not just keyword matches.
            </p>
            <p>
              For example, searching for "pop music with high engagement" will find campaigns
              with similar characteristics, even if they don't use those exact words.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
