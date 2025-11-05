"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Save, Target } from "lucide-react";
import { useRouter } from "next/navigation";

export default function InstagramCampaignBuilderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    campaign_name: '',
    brand_name: '',
    total_budget: 5000,
    creator_count: 10,
  });

  const handleSave = () => {
    // TODO: Save campaign to Supabase
    router.push('/instagram/campaigns');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Campaign Builder</h1>
        <p className="text-muted-foreground">
          Create and configure Instagram influencer campaigns
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Details (Step {step} of 3)
          </CardTitle>
          <CardDescription>
            Set up your Instagram campaign parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="campaign_name">Campaign Name</Label>
                <Input
                  id="campaign_name"
                  placeholder="Enter campaign name"
                  value={formData.campaign_name}
                  onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="brand_name">Brand Name</Label>
                <Input
                  id="brand_name"
                  placeholder="Enter brand name"
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_budget">Total Budget ($)</Label>
                <Input
                  id="total_budget"
                  type="number"
                  placeholder="5000"
                  value={formData.total_budget}
                  onChange={(e) => setFormData({ ...formData, total_budget: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creator_count">Number of Creators</Label>
                <Input
                  id="creator_count"
                  type="number"
                  placeholder="10"
                  value={formData.creator_count}
                  onChange={(e) => setFormData({ ...formData, creator_count: parseInt(e.target.value) || 0 })}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Step 2: Select target genres, territories, and content types
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                (Additional form fields will be added here)
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Step 3: Review and generate campaign recommendations
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                (Campaign algorithm results will be displayed here)
              </p>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {step < 3 ? (
              <Button onClick={() => setStep(Math.min(3, step + 1))}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Campaign
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

