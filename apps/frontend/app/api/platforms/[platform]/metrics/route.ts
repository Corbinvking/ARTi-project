import { type NextRequest, NextResponse } from "next/server"

// Mock data for demonstration
const mockMetrics = {
  spotify: {
    followers: 12500,
    engagement: 85,
    posts: 24,
    reach: 45000,
    impressions: 120000,
  },
  instagram: {
    followers: 45200,
    engagement: 92,
    posts: 156,
    reach: 180000,
    impressions: 450000,
  },
  youtube: {
    followers: 8900,
    engagement: 78,
    posts: 32,
    reach: 25000,
    impressions: 85000,
  },
  soundcloud: {
    followers: 3400,
    engagement: 68,
    posts: 18,
    reach: 12000,
    impressions: 35000,
  },
}

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const platform = params.platform

  if (!mockMetrics[platform as keyof typeof mockMetrics]) {
    return NextResponse.json({ error: "Platform not supported" }, { status: 404 })
  }

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  return NextResponse.json(mockMetrics[platform as keyof typeof mockMetrics])
}
