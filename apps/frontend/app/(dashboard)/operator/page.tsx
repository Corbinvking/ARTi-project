"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OpsQueueContent } from "@/components/operator/ops-queue-content"
import { PlatformDevelopment } from "@/components/operator/platform-development"
import { Headset, Code2 } from "lucide-react"

export default function OperatorPage() {
  const [activeTab, setActiveTab] = useState("ops-queue")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center space-x-2">
          <Headset className="h-8 w-8 text-primary" />
          <span>Operator Panel</span>
        </h1>
        <p className="text-muted-foreground">
          Manage operations queue and platform development requests.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="ops-queue" className="flex items-center gap-2">
            <Headset className="h-4 w-4" />
            Ops Queue
          </TabsTrigger>
          <TabsTrigger value="platform-dev" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Platform Development
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ops-queue" className="mt-6">
          <OpsQueueContent showHeader={false} />
        </TabsContent>

        <TabsContent value="platform-dev" className="mt-6">
          <PlatformDevelopment />
        </TabsContent>
      </Tabs>
    </div>
  )
}
