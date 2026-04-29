
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, FileText, Calendar, Clock, Mail } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { toast } from 'sonner';

const ExportDataPage = () => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    // Mock export delay
    setTimeout(() => {
      setIsExporting(false);
      toast.success(`Data successfully exported as ${exportFormat.toUpperCase()}`);
    }, 1500);
  };

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Export & Reports</h1>
        <p className="text-muted-foreground mt-1">Generate custom reports and export system data.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-soft-md border-border/50 bg-card">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle>Configure Export</CardTitle>
              <CardDescription>Select the data entities you want to include in your report.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              
              {/* Data Selection */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Data Entities</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'pdfs', label: 'Resources (PDFs)', desc: 'Metadata, categories, sizes' },
                    { id: 'schools', label: 'Schools Directory', desc: 'Contact info, locations, status' },
                    { id: 'users', label: 'User Accounts', desc: 'Roles, emails, last login' },
                    { id: 'downloads', label: 'Download Logs', desc: 'Timestamps, user IDs, file IDs' },
                    { id: 'audit', label: 'Audit Logs', desc: 'System actions, IP addresses' },
                  ].map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 rounded-[var(--radius-md)] border border-border/50 hover:bg-muted/30 transition-colors">
                      <Checkbox id={item.id} defaultChecked={item.id === 'pdfs' || item.id === 'downloads'} className="mt-1" />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor={item.id} className="font-medium cursor-pointer">{item.label}</Label>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Date Range</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select defaultValue="30d">
                    <SelectTrigger className="w-full sm:w-[200px] bg-background">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 Days</SelectItem>
                      <SelectItem value="30d">Last 30 Days</SelectItem>
                      <SelectItem value="90d">Last 90 Days</SelectItem>
                      <SelectItem value="ytd">Year to Date</SelectItem>
                      <SelectItem value="all">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-soft-md border-border/50 bg-card">
            <CardHeader>
              <CardTitle>Export Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant={exportFormat === 'csv' ? 'default' : 'outline'} 
                  className={exportFormat === 'csv' ? 'bg-primary text-primary-foreground shadow-soft-sm' : 'bg-background'}
                  onClick={() => setExportFormat('csv')}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
                </Button>
                <Button 
                  variant={exportFormat === 'pdf' ? 'default' : 'outline'} 
                  className={exportFormat === 'pdf' ? 'bg-primary text-primary-foreground shadow-soft-sm' : 'bg-background'}
                  onClick={() => setExportFormat('pdf')}
                >
                  <FileText className="w-4 h-4 mr-2" /> PDF
                </Button>
              </div>

              <div className="pt-4 border-t border-border/50">
                <Button variant="gradient" className="w-full h-12 text-base" onClick={handleExport} isLoading={isExporting}>
                  <Download className="w-5 h-5 mr-2" /> Generate Export
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft-sm border-border/50 bg-gradient-subtle">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" /> Scheduled Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Automate your reporting by scheduling exports to be sent via email.</p>
              <Button variant="outline" className="w-full bg-background">
                <Mail className="w-4 h-4 mr-2" /> Setup Schedule
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default ExportDataPage;
