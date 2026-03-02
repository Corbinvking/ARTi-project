"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Upload, Download, Check, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseCSV, parsePriceString, downloadCSV } from "@/lib/csv-import";
import { supabase } from "@/lib/auth";

interface CampaignCreatorMinimal {
  id: string;
  instagram_handle: string;
  rate: number;
}

interface CreatorRateImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignCreators: CampaignCreatorMinimal[];
  onImportComplete: () => void;
}

interface RateMatch {
  csvHandle: string;
  creatorId: string;
  currentRate: number;
  newRate: number;
}

function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase().replace(/^@/, "");
}

export function CreatorRateImportModal({
  open,
  onOpenChange,
  campaignCreators,
  onImportComplete,
}: CreatorRateImportModalProps) {
  const [matches, setMatches] = useState<RateMatch[]>([]);
  const [unmatchedHandles, setUnmatchedHandles] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const { toast } = useToast();

  const reset = () => {
    setMatches([]);
    setUnmatchedHandles([]);
    setIsImporting(false);
    setIsDone(false);
    setResultMessage("");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      const csvData = await parseCSV(file);
      const handleCol = csvData.headers.find((h) =>
        /^(handle|instagram_handle|creator|username|page)$/i.test(h.trim())
      );
      const rateCol = csvData.headers.find((h) =>
        /^(rate|price|amount|cost|fee)$/i.test(h.trim())
      );

      if (!handleCol || !rateCol) {
        toast({
          title: "Missing columns",
          description: `CSV must have a handle column (e.g. "instagram_handle") and a rate column (e.g. "rate"). Found: ${csvData.headers.join(", ")}`,
          variant: "destructive",
        });
        return;
      }

      const creatorMap = new Map<string, CampaignCreatorMinimal>();
      for (const c of campaignCreators) {
        creatorMap.set(normalizeHandle(c.instagram_handle), c);
      }

      const matched: RateMatch[] = [];
      const unmatched: string[] = [];

      for (const row of csvData.rows) {
        const rawHandle = String(row[handleCol] || "").trim();
        if (!rawHandle) continue;
        const norm = normalizeHandle(rawHandle);
        const newRate = parsePriceString(String(row[rateCol] || ""));
        const creator = creatorMap.get(norm);
        if (creator) {
          matched.push({
            csvHandle: rawHandle,
            creatorId: creator.id,
            currentRate: creator.rate || 0,
            newRate,
          });
        } else {
          unmatched.push(rawHandle);
        }
      }

      setMatches(matched);
      setUnmatchedHandles(unmatched);
    } catch (error: any) {
      toast({
        title: "CSV Error",
        description: error.message || "Failed to parse CSV.",
        variant: "destructive",
      });
    }
  };

  const processImport = async () => {
    if (matches.length === 0) return;
    setIsImporting(true);

    let updated = 0;
    let errors = 0;

    for (const match of matches) {
      const { error } = await supabase
        .from("instagram_campaign_creators")
        .update({ rate: match.newRate })
        .eq("id", match.creatorId);

      if (error) {
        errors++;
        console.error(`Failed to update ${match.csvHandle}:`, error);
      } else {
        updated++;
      }
    }

    setIsImporting(false);
    setIsDone(true);

    const msg = `Updated ${updated} creator rate${updated !== 1 ? "s" : ""}${errors > 0 ? ` (${errors} failed)` : ""}.`;
    setResultMessage(msg);
    toast({ title: "Rates Imported", description: msg });
    onImportComplete();
  };

  const downloadTemplate = () => {
    const templateRows = campaignCreators.map((c) => ({
      instagram_handle: c.instagram_handle,
      rate: c.rate || 0,
    }));
    if (templateRows.length === 0) {
      templateRows.push({ instagram_handle: "creator_handle", rate: 100 });
    }
    downloadCSV(templateRows, "creator_rates_template.csv");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (isImporting) return;
        if (!newOpen) reset();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Creator Rates</DialogTitle>
          <DialogDescription>
            Upload a CSV with creator handles and rates to bulk-update rates for this campaign.
          </DialogDescription>
        </DialogHeader>

        {isDone ? (
          <div className="text-center py-8 space-y-4">
            <Check className="w-12 h-12 mx-auto text-green-500" />
            <p className="font-medium text-lg">{resultMessage}</p>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
              Close
            </Button>
          </div>
        ) : matches.length === 0 ? (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <Label htmlFor="rate-csv-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Upload CSV File</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    CSV must include columns: <strong>instagram_handle</strong> and <strong>rate</strong>
                  </p>
                </Label>
                <Input
                  id="rate-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Download Template
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Expected Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><Badge variant="default" className="mr-2">Required</Badge> instagram_handle, rate</p>
                  <p className="text-xs mt-2">
                    Handles are matched case-insensitively; leading &quot;@&quot; is stripped automatically.
                    Rate can include &quot;$&quot; or commas (e.g. &quot;$1,200&quot;).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                <Badge variant="default" className="mr-2">{matches.length}</Badge>
                creator{matches.length !== 1 ? "s" : ""} matched
              </p>
              <Button variant="outline" size="sm" onClick={reset}>
                Upload Different File
              </Button>
            </div>

            <ScrollArea className="h-60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Handle</TableHead>
                    <TableHead className="text-right">Current Rate</TableHead>
                    <TableHead className="text-right">New Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((m) => (
                    <TableRow key={m.creatorId}>
                      <TableCell className="font-medium text-sm">@{normalizeHandle(m.csvHandle)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">${m.currentRate.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${m.newRate.toLocaleString()}
                        {m.newRate !== m.currentRate && (
                          <span className={`ml-1 text-xs ${m.newRate > m.currentRate ? "text-green-600" : "text-red-600"}`}>
                            ({m.newRate > m.currentRate ? "+" : ""}{(m.newRate - m.currentRate).toLocaleString()})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {unmatchedHandles.length > 0 && (
              <Alert variant="destructive" className="bg-amber-500/5 border-amber-500/30">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700">
                  {unmatchedHandles.length} handle{unmatchedHandles.length !== 1 ? "s" : ""} in CSV not found in this campaign:{" "}
                  <span className="font-mono text-xs">{unmatchedHandles.slice(0, 5).join(", ")}{unmatchedHandles.length > 5 ? `, +${unmatchedHandles.length - 5} more` : ""}</span>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
                Cancel
              </Button>
              <Button onClick={processImport} disabled={isImporting} className="gap-2">
                {isImporting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <>Update {matches.length} Rate{matches.length !== 1 ? "s" : ""}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
