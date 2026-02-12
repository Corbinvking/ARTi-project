"use client"

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Download,
  Copy,
  FileSpreadsheet,
  Users,
  Shield,
} from "lucide-react";
import { parseCSV, type ParsedCSVData } from "@/lib/csv-import";
import { useBulkImportSalespeople, type BulkImportRow, type BulkImportResult } from "@/hooks/use-salespeople";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Types
// ============================================================================

interface SalespeopleImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'results';

interface ParsedSalesperson {
  name: string;
  email: string;
  status: string;
  notes: string;
  hasEmail: boolean;
  isDuplicate: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function SalespeopleImportModal({ open, onOpenChange }: SalespeopleImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedCSVData | null>(null);
  const [parsedPeople, setParsedPeople] = useState<ParsedSalesperson[]>([]);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const bulkImport = useBulkImportSalespeople();
  const { toast } = useToast();

  // -------------------------------------------------------------------------
  // CSV Parsing
  // -------------------------------------------------------------------------

  const processCSV = useCallback(async (file: File) => {
    try {
      const data = await parseCSV(file);
      setCsvData(data);

      // Parse and deduplicate
      const emailsSeen = new Set<string>();
      const people: ParsedSalesperson[] = [];

      for (const row of data.rows) {
        const name = (row['Name'] || row['name'] || '').trim();
        const email = (row['Email'] || row['email'] || '').trim().toLowerCase();
        const status = (row['Status'] || row['status'] || 'Active').trim();
        const notes = (row['Notes'] || row['notes'] || '').trim();

        if (!name) continue;

        const hasEmail = !!email;
        const isDuplicate = hasEmail && emailsSeen.has(email);

        if (hasEmail) emailsSeen.add(email);

        people.push({ name, email, status, notes, hasEmail, isDuplicate });
      }

      setParsedPeople(people);
      setStep('preview');
    } catch (error: any) {
      toast({
        title: "CSV Parse Error",
        description: error.message || "Failed to parse CSV file",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processCSV(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      await processCSV(file);
    }
  };

  // -------------------------------------------------------------------------
  // Import Execution
  // -------------------------------------------------------------------------

  const handleImport = async () => {
    setStep('importing');

    // Only import people with valid emails who aren't duplicates
    const toImport: BulkImportRow[] = parsedPeople
      .filter(p => p.hasEmail && !p.isDuplicate)
      .map(p => ({
        name: p.name,
        email: p.email,
        status: p.status,
        notes: p.notes || undefined,
      }));

    try {
      const result = await bulkImport.mutateAsync(toImport);
      setImportResult(result);
      setStep('results');
    } catch (error) {
      setStep('preview');
    }
  };

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  const copyCredentials = () => {
    if (!importResult) return;
    const text = importResult.credentials
      .map(c => `${c.name}\t${c.email}\t${c.tempPassword}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: "Credentials copied to clipboard" });
  };

  const downloadCredentials = () => {
    if (!importResult) return;
    const csv = ['Name,Email,Temporary Password']
      .concat(importResult.credentials.map(c => `"${c.name}","${c.email}","${c.tempPassword}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salespeople-credentials-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStep('upload');
      setCsvData(null);
      setParsedPeople([]);
      setImportResult(null);
    }, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // -------------------------------------------------------------------------
  // Summary Stats
  // -------------------------------------------------------------------------

  const importable = parsedPeople.filter(p => p.hasEmail && !p.isDuplicate);
  const noEmail = parsedPeople.filter(p => !p.hasEmail);
  const duplicates = parsedPeople.filter(p => p.isDuplicate);
  const activeCount = importable.filter(p => p.status === 'Active').length;
  const inactiveCount = importable.filter(p => p.status === 'Inactive').length;
  const pendingCount = importable.filter(p => p.status === 'Pending').length;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Import Salespeople
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file to bulk import salespeople with login accounts.'}
            {step === 'preview' && 'Review the data before importing. Each person with an email gets a login account.'}
            {step === 'importing' && 'Creating accounts and importing salespeople...'}
            {step === 'results' && 'Import complete! Review the results below.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
                ${isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('csv-upload-salespeople')?.click()}
            >
              <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Expected columns: Name, Email, Status, Notes
              </p>
              <input
                id="csv-upload-salespeople"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>

            <Alert>
              <Shield className="w-4 h-4" />
              <AlertTitle>What happens during import</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                  <li>Each person with an email gets a <strong>Supabase Auth account</strong> with the <strong>sales</strong> role</li>
                  <li>They get access to Dashboard, Spotify, YouTube, SoundCloud, and Instagram</li>
                  <li>A <strong>temporary password</strong> is generated for each person</li>
                  <li>Existing users (same email) are skipped safely</li>
                  <li>Rows without emails are added as salespeople records only (no login)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {importable.length}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-300">Will Import</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {activeCount}
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-300">Active</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {pendingCount + inactiveCount}
                </div>
                <div className="text-xs text-yellow-600 dark:text-yellow-300">Pending/Inactive</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-950/30 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-700 dark:text-gray-400">
                  {noEmail.length + duplicates.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Skipped</div>
              </div>
            </div>

            {/* Warnings */}
            {(noEmail.length > 0 || duplicates.length > 0) && (
              <Alert variant="default">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Some rows will be skipped</AlertTitle>
                <AlertDescription className="text-sm">
                  {noEmail.length > 0 && (
                    <div>
                      <strong>{noEmail.length} without email:</strong>{' '}
                      {noEmail.map(p => p.name).join(', ')}
                    </div>
                  )}
                  {duplicates.length > 0 && (
                    <div className="mt-1">
                      <strong>{duplicates.length} duplicate emails:</strong>{' '}
                      {duplicates.map(p => `${p.name} (${p.email})`).join(', ')}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Preview Table */}
            <div className="border rounded-lg max-h-[40vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedPeople.map((person, idx) => (
                    <TableRow
                      key={idx}
                      className={
                        !person.hasEmail || person.isDuplicate
                          ? 'opacity-50'
                          : ''
                      }
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-medium">{person.name}</TableCell>
                      <TableCell className="text-sm">
                        {person.email || <span className="text-muted-foreground italic">none</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(person.status)}`}>
                          {person.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {person.isDuplicate ? (
                          <Badge variant="outline" className="text-xs">Duplicate</Badge>
                        ) : !person.hasEmail ? (
                          <Badge variant="outline" className="text-xs">No Email</Badge>
                        ) : (
                          <Badge className="text-xs bg-blue-100 text-blue-800 hover:bg-blue-100">
                            Create Login
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleImport} disabled={importable.length === 0}>
                Import {importable.length} Salespeople
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Importing */}
        {step === 'importing' && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div>
              <p className="text-lg font-medium">Creating accounts...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Importing {importable.length} salespeople with login credentials.
                This may take a minute.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && importResult && (
          <div className="space-y-4">
            {/* Result Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-4 text-center">
                <Check className="w-6 h-6 mx-auto text-emerald-600 mb-1" />
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {importResult.created}
                </div>
                <div className="text-xs text-emerald-600">Created</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-yellow-600 mb-1" />
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                  {importResult.skipped}
                </div>
                <div className="text-xs text-yellow-600">Skipped (existing)</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center">
                <AlertCircle className="w-6 h-6 mx-auto text-red-600 mb-1" />
                <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {importResult.errors.length}
                </div>
                <div className="text-xs text-red-600">Errors</div>
              </div>
            </div>

            {/* Credentials Table */}
            {importResult.credentials.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">Login Credentials</h4>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyCredentials}>
                      <Copy className="w-3 h-3 mr-1" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCredentials}>
                      <Download className="w-3 h-3 mr-1" /> Download CSV
                    </Button>
                  </div>
                </div>

                <Alert className="mb-3">
                  <Shield className="w-4 h-4" />
                  <AlertDescription className="text-sm">
                    Save these credentials now. Users should change their password on first login.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg max-h-[35vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Temp Password</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.credentials.map((cred, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{cred.name}</TableCell>
                          <TableCell>{cred.email}</TableCell>
                          <TableCell className="font-mono text-sm">{cred.tempPassword}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Import Errors</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside text-sm mt-1">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>
                        {err.name} ({err.email}): {err.error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Close Button */}
            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
