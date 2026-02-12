"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "../../hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { Upload, Download, Check, AlertCircle, Loader2, ArrowRight, ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  parseCSV,
  detectColumnMappings,
  parseGoalString,
  parseDateString,
  downloadCSV,
  createInitialProgress,
  type ParsedCSVData,
  type ImportProgress,
  type ColumnPattern,
} from "@/lib/csv-import";

interface CampaignImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

// SoundCloud campaign field definitions (targets soundcloud_campaigns table)
const REQUIRED_FIELDS = [
  { key: 'track_url', label: 'Track URL', required: true },
  { key: 'track_info', label: 'Track Info (Artist - Track)', required: false },
  { key: 'artist_name', label: 'Artist Name', required: false },
  { key: 'track_name', label: 'Track Name', required: false },
  { key: 'client', label: 'Client', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'start_date', label: 'Start Date', required: false },
  { key: 'submission_date', label: 'Submit Date', required: false },
  { key: 'goals', label: 'Goal (Reach)', required: false },
  { key: 'remaining', label: 'Remaining', required: false },
  { key: 'campaign_type', label: 'Service Type', required: false },
  { key: 'invoice_status', label: 'Invoice Status', required: false },
  { key: 'notes', label: 'Notes', required: false },
];

// Column auto-detection patterns
const COLUMN_PATTERNS: ColumnPattern[] = [
  { field: 'track_url', pattern: /^(track\s*url|url|link|soundcloud\s*url|soundcloud\s*link)$/i },
  { field: 'track_info', pattern: /^(track\s*info)$/i },
  { field: 'artist_name', pattern: /^(artist|artist\s*name)$/i },
  { field: 'track_name', pattern: /^(track|track\s*name|song|title)$/i },
  { field: 'client', pattern: /^(client|client\s*name|label)$/i },
  { field: 'status', pattern: /^(status|state)$/i },
  { field: 'start_date', pattern: /^(start\s*date|launch\s*date)$/i },
  { field: 'submission_date', pattern: /^(submit\s*date|submission\s*date|date\s*submitted)$/i },
  { field: 'goals', pattern: /^(goal|goals|expected\s*reach|reach|target|reposts?)$/i },
  { field: 'remaining', pattern: /^(remaining|remaining\s*metrics|left)$/i },
  { field: 'campaign_type', pattern: /^(service\s*type|campaign\s*type|type)$/i },
  { field: 'invoice_status', pattern: /^(invoice|invoice\s*status|payment)$/i },
  { field: 'notes', pattern: /^(notes?|comments?|description)$/i },
];

type ImportStep = 'upload' | 'mapping' | 'importing';

export function CampaignImportModal({ open, onOpenChange, onImportComplete }: CampaignImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState<ImportProgress>(createInitialProgress(3));
  const [importStatus, setImportStatus] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [replaceMode, setReplaceMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingCount, setExistingCount] = useState(0);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing count
  const fetchExistingCount = async () => {
    const { count } = await supabase
      .from('soundcloud_campaigns')
      .select('*', { count: 'exact', head: true });
    setExistingCount(count || 0);
  };

  // Export backup
  const exportBackup = async () => {
    setIsExportingBackup(true);
    try {
      const { data } = await supabase
        .from('soundcloud_campaigns')
        .select('*')
        .order('created_at');

      if (!data || data.length === 0) {
        toast({ title: "No Campaigns", description: "No campaigns to backup." });
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(data, `soundcloud_campaigns_backup_${timestamp}.csv`);
      toast({ title: "Backup Exported", description: `Exported ${data.length} campaigns.` });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Delete all existing campaigns
  const deleteAllCampaigns = async () => {
    const { error } = await supabase
      .from('soundcloud_campaigns')
      .delete()
      .gt('id', 0);

    if (error) {
      console.error('Error deleting campaigns:', error);
      throw error;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);
      setCsvData(data);

      // Auto-detect mappings
      const autoMappings = detectColumnMappings(data.headers, COLUMN_PATTERNS);
      setColumnMappings(autoMappings);

      await fetchExistingCount();
      setStep('mapping');
    } catch (error: any) {
      toast({
        title: "CSV Parsing Error",
        description: error.message || "Failed to parse CSV file.",
        variant: "destructive",
      });
    }

    event.target.value = '';
  };

  const handleColumnMappingChange = (dbField: string, csvColumn: string) => {
    setColumnMappings(prev => ({ ...prev, [dbField]: csvColumn }));
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Track Info': 'Artist Name - Track Title',
        'Client': 'Client Name',
        'Track URL': 'https://soundcloud.com/artist/track-name',
        'Status': 'active',
        'Start Date': '1/15/2026',
        'Submit Date': '1/10/2026',
        'Goal': '10000000',
        'Remaining': '5000000',
        'Service Type': 'Reposts',
        'Invoice': 'Sent',
        'Notes': 'Campaign notes',
      },
      {
        'Track Info': 'Another Artist - Another Track',
        'Client': 'Another Client',
        'Track URL': 'https://soundcloud.com/another-artist/another-track',
        'Status': 'active',
        'Start Date': '2/1/2026',
        'Submit Date': '1/28/2026',
        'Goal': '20000000',
        'Remaining': '15000000',
        'Service Type': 'Reposts',
        'Invoice': 'TBD',
        'Notes': '',
      },
    ];
    downloadCSV(templateData, 'soundcloud_campaign_import_template.csv');
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const requiredFields = REQUIRED_FIELDS.filter(f => f.required);

    for (const field of requiredFields) {
      if (!columnMappings[field.key] || columnMappings[field.key] === '__SKIP__') {
        errors.push(`${field.label} is required but not mapped.`);
      }
    }

    return errors;
  };

  /** Parse "Artist - Track" format from Track Info column */
  const parseTrackInfo = (trackInfo: string): { artist: string; track: string } => {
    if (!trackInfo) return { artist: '', track: '' };
    const dashIdx = trackInfo.indexOf(' - ');
    if (dashIdx > 0) {
      return {
        artist: trackInfo.substring(0, dashIdx).trim(),
        track: trackInfo.substring(dashIdx + 3).trim(),
      };
    }
    return { artist: '', track: trackInfo.trim() };
  };

  const processImport = async () => {
    const validationErrors = validateMappings();
    if (validationErrors.length > 0) {
      toast({
        title: "Mapping Error",
        description: validationErrors.join(' '),
        variant: "destructive",
      });
      return;
    }

    setStep('importing');
    setIsImporting(true);
    setImportErrors([]);
    const errors: string[] = [];
    const BATCH_SIZE = 50;

    try {
      // PHASE 0: Delete existing if replace mode
      if (replaceMode) {
        setImportProgress({ current: 0, total: 1, phase: 'Deleting existing campaigns...', phaseNum: 0, totalPhases: 3 });
        await deleteAllCampaigns();
      }

      // PHASE 1: Create clients from CSV data
      setImportProgress({ current: 0, total: 1, phase: 'Preparing clients...', phaseNum: 1, totalPhases: 3 });
      setImportStatus('Phase 1/3: Creating clients...');

      // Build a cache of client_name → client_id
      const clientCache = new Map<string, string>();
      const clientColumn = columnMappings.client;
      if (clientColumn && clientColumn !== '__SKIP__') {
        const uniqueClients = new Set(csvData!.rows.map(r => (r[clientColumn] || '').trim()).filter(Boolean));
        let clientIdx = 0;
        for (const clientName of uniqueClients) {
          clientIdx++;
          setImportStatus(`Phase 1/3: Creating client ${clientIdx}/${uniqueClients.size}: ${clientName}`);
          try {
            const clientId = await getOrCreateClient(clientName);
            clientCache.set(clientName, clientId);
          } catch (err: any) {
            errors.push(`Client "${clientName}": ${err.message}`);
          }
        }
      }

      // PHASE 2: Prepare and insert campaigns (actual DB schema: flat text columns)
      setImportProgress({ current: 0, total: csvData!.rows.length, phase: 'Importing campaigns...', phaseNum: 2, totalPhases: 3 });
      setImportStatus('Phase 2/3: Preparing campaign data...');

      const campaignRows = csvData!.rows.map(row => {
        // Build track_info from either track_info column or artist + track
        let trackInfo = '';
        if (columnMappings.track_info && columnMappings.track_info !== '__SKIP__') {
          trackInfo = row[columnMappings.track_info] || '';
        }
        if (!trackInfo) {
          const artist = row[columnMappings.artist_name] || '';
          const track = row[columnMappings.track_name] || '';
          trackInfo = artist && track ? `${artist} - ${track}` : artist || track;
        }

        // Client name
        const clientName = clientColumn && clientColumn !== '__SKIP__'
          ? (row[clientColumn] || '').trim()
          : '';

        return {
          track_info: trackInfo || null,
          client: clientName,
          url: row[columnMappings.track_url] || '',
          service_type: row[columnMappings.campaign_type] || 'Reposts',
          status: row[columnMappings.status] || 'Active',
          start_date: row[columnMappings.start_date] || '',
          submit_date: row[columnMappings.submission_date] || '',
          goal: row[columnMappings.goals] || '',
          remaining: row[columnMappings.remaining] || '',
          invoice: row[columnMappings.invoice_status] || 'TBD',
          notes: row[columnMappings.notes] || '',
          internal_notes: row[columnMappings.notes] || null,
        };
      }).filter(row => row.url);

      // Batch insert
      let createdCount = 0;
      const totalBatches = Math.ceil(campaignRows.length / BATCH_SIZE);

      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        const start = batchIdx * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, campaignRows.length);
        const batch = campaignRows.slice(start, end);

        setImportProgress({
          current: end,
          total: campaignRows.length,
          phase: `Importing campaigns (batch ${batchIdx + 1}/${totalBatches})...`,
          phaseNum: 2,
          totalPhases: 3,
        });
        setImportStatus(`Phase 2/3: Importing campaigns ${start + 1}-${end} of ${campaignRows.length}...`);

        const { data, error } = await supabase
          .from('soundcloud_campaigns')
          .insert(batch)
          .select('id');

        if (error) {
          errors.push(`Batch ${batchIdx + 1}: ${error.message}`);
        } else {
          createdCount += data?.length || 0;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // PHASE 3: Finalize
      setImportProgress({ current: 1, total: 1, phase: 'Finalizing...', phaseNum: 3, totalPhases: 3 });
      setImportStatus('Phase 3/3: Finalizing import...');

      setImportErrors(errors);

      // Success
      const summary = `Import complete! ${createdCount} campaigns created (${clientCache.size} clients).${errors.length > 0 ? ` (${errors.length} warnings)` : ''}${replaceMode ? ' (replaced existing)' : ''}`;
      setImportStatus(summary);
      setImportProgress({ current: 1, total: 1, phase: 'Complete!', phaseNum: 3, totalPhases: 3 });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['soundcloud-campaigns'] });

      toast({ title: "Import Successful", description: summary });

      setIsImporting(false);
      
      if (onImportComplete) {
        onImportComplete();
      }

      setTimeout(() => {
        onOpenChange(false);
        resetModal();
      }, 2000);

    } catch (error: any) {
      setIsImporting(false);
      setImportErrors([...errors, error.message]);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetModal = () => {
    setStep('upload');
    setCsvData(null);
    setColumnMappings({});
    setImportProgress(createInitialProgress(3));
    setImportStatus('');
    setImportErrors([]);
    setIsImporting(false);
    setReplaceMode(false);
    setShowDeleteConfirm(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Replace Mode Toggle */}
      <Card className={replaceMode ? "border-destructive bg-destructive/5" : ""}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${replaceMode ? 'text-destructive' : 'text-muted-foreground'}`} />
              <CardTitle className="text-sm">Replace Mode</CardTitle>
            </div>
            <Switch checked={replaceMode} onCheckedChange={setReplaceMode} />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            {replaceMode
              ? "All existing campaigns will be deleted before importing."
              : "New campaigns will be added alongside existing ones."}
          </p>
          {replaceMode && existingCount > 0 && (
            <Alert variant="destructive" className="mt-3">
              <Trash2 className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                This will delete <strong>{existingCount}</strong> existing campaigns.
              </AlertDescription>
            </Alert>
          )}
          {replaceMode && (
            <Button variant="outline" size="sm" onClick={exportBackup} disabled={isExportingBackup} className="mt-3 gap-2">
              <Download className="w-4 h-4" />
              {isExportingBackup ? 'Exporting...' : 'Export Backup'}
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="text-center space-y-4">
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <Label htmlFor="csv-upload" className="cursor-pointer">
            <span className="text-lg font-medium">Upload CSV File</span>
            <p className="text-sm text-muted-foreground mt-1">Select a CSV file with your SoundCloud campaign data</p>
          </Label>
          <Input id="csv-upload" type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
        </div>

        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Required Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <p><Badge variant="default" className="mr-2">Required</Badge> Track URL</p>
            <p><Badge variant="outline" className="mr-2">Optional</Badge> Track Info, Artist Name, Track Name, Client, Status, Start Date, Submit Date, Goal, Remaining, Service Type, Invoice Status, Notes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Map CSV Columns</h3>
        <Button variant="outline" onClick={() => setStep('upload')} size="sm" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* CSV Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CSV Preview ({csvData!.rows.length} rows)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded border overflow-x-auto max-h-48">
            <Table>
              <TableHeader>
                <TableRow>
                  {csvData!.headers.map(header => (
                    <TableHead key={header} className="min-w-[120px] text-xs">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {csvData!.previewRows.map((row, idx) => (
                  <TableRow key={idx}>
                    {csvData!.headers.map(header => (
                      <TableCell key={header} className="text-xs max-w-[150px] truncate">
                        {String(row[header] || '').substring(0, 50)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Column Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {REQUIRED_FIELDS.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <Label className="min-w-[160px] text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Select
                value={columnMappings[field.key] || ''}
                onValueChange={(value) => handleColumnMappingChange(field.key, value)}
              >
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue placeholder="Select column..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__SKIP__">-- Skip --</SelectItem>
                  {csvData!.headers.map(header => (
                    <SelectItem key={header} value={header}>{header}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (replaceMode && existingCount > 0) {
              setShowDeleteConfirm(true);
            } else {
              processImport();
            }
          }}
          className={`gap-2 ${replaceMode ? 'bg-destructive hover:bg-destructive/90' : ''}`}
        >
          {replaceMode ? (
            <>
              <Trash2 className="w-4 h-4" />
              Delete & Import
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4" />
              Start Import
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6">
      <div className="space-y-4 text-center">
        {importProgress.phase !== 'Complete!' ? (
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
        ) : (
          <Check className="w-12 h-12 mx-auto text-green-500" />
        )}
        <div>
          <h3 className="font-medium text-lg">{importProgress.phase || 'Importing Submissions'}</h3>
          <p className="text-sm text-muted-foreground mt-1">{importStatus}</p>
        </div>

        {importProgress.total > 0 && (
          <div className="space-y-2 max-w-md mx-auto">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Phase {importProgress.phaseNum}/{importProgress.totalPhases}</span>
              <span>{importProgress.current} / {importProgress.total}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (importProgress.current / importProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {importErrors.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              Warnings ({importErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-32 overflow-y-auto">
            <ul className="text-xs space-y-1 text-amber-700">
              {importErrors.slice(0, 10).map((error, idx) => (
                <li key={idx} className="truncate">• {error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(newOpen) => {
          if (isImporting && !newOpen) {
            toast({ title: "Import in Progress", description: "Please wait for the import to complete.", variant: "destructive" });
            return;
          }
          onOpenChange(newOpen);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import SoundCloud Campaigns</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import campaign/submission data
              {replaceMode && <Badge variant="destructive" className="ml-2">Replace Mode</Badge>}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step indicator */}
            <div className="flex items-center justify-center space-x-4">
              {['upload', 'mapping', 'importing'].map((stepName, index) => (
                <div key={stepName} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step === stepName ? 'bg-primary text-primary-foreground' :
                      ['upload', 'mapping', 'importing'].indexOf(step) > index ? 'bg-muted-foreground text-white' :
                      'bg-muted text-muted-foreground'}`}
                  >
                    {index + 1}
                  </div>
                  {index < 2 && <div className="w-8 h-px bg-muted mx-2" />}
                </div>
              ))}
            </div>

            {step === 'upload' && renderUploadStep()}
            {step === 'mapping' && renderMappingStep()}
            {step === 'importing' && renderImportStep()}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Campaigns?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{existingCount}</strong> existing campaigns.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowDeleteConfirm(false); processImport(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete & Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
