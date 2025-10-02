"use client"

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Calendar } from "./ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { 
  FileText, 
  Download, 
  Mail, 
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Users,
  Target
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../integrations/supabase/client";

interface ReportProgress {
  id: string;
  name: string;
  type: 'pdf' | 'excel';
  status: 'generating' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
}

const ReportsDashboard = () => {
  const [selectedReportType, setSelectedReportType] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reportProgress, setReportProgress] = useState<ReportProgress[]>([]);
  const { toast } = useToast();

  const reportTypes = [
    { value: "campaign-performance", label: "Campaign Performance", icon: Target },
    { value: "executive-summary", label: "Executive Summary", icon: BarChart3 },
    { value: "vendor-performance", label: "Vendor Performance", icon: Users },
    { value: "raw-data-export", label: "Raw Data Export", icon: FileText }
  ];

  const handleGenerateReport = async (format: 'pdf' | 'excel') => {
    if (!selectedReportType) {
      toast({
        title: "Error",
        description: "Please select a report type",
        variant: "destructive",
      });
      return;
    }

    const reportId = Math.random().toString(36).substr(2, 9);
    const newReport: ReportProgress = {
      id: reportId,
      name: reportTypes.find(r => r.value === selectedReportType)?.label || "Report",
      type: format,
      status: 'generating',
      progress: 0
    };

    setReportProgress(prev => [...prev, newReport]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          reportType: selectedReportType,
          format,
          dateRange,
          reportId
        }
      });

      if (error) throw error;

      toast({
        title: "Report Generation Started",
        description: `Your ${format.toUpperCase()} report is being generated.`,
      });

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setReportProgress(prev => prev.map(report => {
          if (report.id === reportId && report.status === 'generating') {
            const newProgress = Math.min(report.progress + 20, 100);
            return {
              ...report,
              progress: newProgress,
              status: newProgress === 100 ? 'completed' : 'generating',
              downloadUrl: newProgress === 100 ? data?.downloadUrl : undefined
            };
          }
          return report;
        }));
      }, 2000);

      setTimeout(() => clearInterval(progressInterval), 12000);

    } catch (error) {
      console.error('Report generation error:', error);
      setReportProgress(prev => prev.map(report => 
        report.id === reportId ? { ...report, status: 'failed', progress: 0 } : report
      ));
      toast({
        title: "Generation Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (report: ReportProgress) => {
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports Dashboard</h1>
        <p className="text-muted-foreground">Generate and download detailed reports</p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Generator
              </CardTitle>
              <CardDescription>
                Select report type and date range to generate professional reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange.to ? (
                            <>
                              {format(dateRange.from, "LLL dd, y")} -{" "}
                              {format(dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => handleGenerateReport('pdf')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate PDF
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => handleGenerateReport('excel')}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Generate Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {reportProgress.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Generation Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportProgress.map((report) => (
                    <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {report.status === 'generating' && <Clock className="h-4 w-4 text-primary animate-pulse" />}
                          {report.status === 'completed' && <CheckCircle className="h-4 w-4 text-accent" />}
                          {report.status === 'failed' && <AlertCircle className="h-4 w-4 text-destructive" />}
                          <span className="font-medium">{report.name}</span>
                        </div>
                        <Badge variant="outline">{report.type.toUpperCase()}</Badge>
                        <Badge variant={
                          report.status === 'completed' ? 'default' :
                          report.status === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {report.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {report.status === 'generating' && (
                          <div className="flex items-center gap-2">
                            <Progress value={report.progress} className="w-24" />
                            <span className="text-sm text-muted-foreground">{report.progress}%</span>
                          </div>
                        )}
                        {report.status === 'completed' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleDownload(report)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Report History</CardTitle>
              <CardDescription>
                View and download previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No previous reports found</p>
                <p className="text-sm">Generated reports will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsDashboard;








