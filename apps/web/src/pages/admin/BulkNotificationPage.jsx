
import React, { useEffect, useMemo, useState } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { Send, Mail, MessageSquare, AlertCircle, BellRing } from 'lucide-react';

const BulkNotificationPage = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all_schools');
  const [channels, setChannels] = useState(['in_app']);
  const [schools, setSchools] = useState([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        const res = await client.fetch('/schools', 'GET', null, { per_page: 500, sort: 'schoolName' });
        setSchools(res.items || []);
      } catch (err) {
        toast.error('Failed to load schools');
      } finally {
        setLoadingSchools(false);
      }
    };
    loadSchools();
  }, []);

  const selectedSchoolsCount = useMemo(() => selectedSchoolIds.length, [selectedSchoolIds]);

  const toggleChannel = (name) => {
    setChannels((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const toggleSchool = (id) => {
    setSelectedSchoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async () => {
    if (!subject || !message) {
      toast.error('Subject and message are required');
      return;
    }
    if (!channels.length) {
      toast.error('Select at least one delivery channel');
      return;
    }
    if (recipientType === 'selected_schools' && !selectedSchoolIds.length) {
      toast.error('Please select at least one school');
      return;
    }

    setLoading(true);
    try {
      const result = await client.fetch('/notifications/admin/send', 'POST', {
        subject,
        message,
        type: 'bulk_announcement',
        channels,
        targetMode: recipientType,
        schoolIds: recipientType === 'selected_schools' ? selectedSchoolIds : [],
      });

      toast.success(
        `Queued ${result.created} notifications (${result.sent} sent, ${result.failed} failed) for ${result.totalRecipients} recipients`
      );
      setSubject('');
      setMessage('');
      setSelectedSchoolIds([]);
    } catch (err) {
      toast.error(err.message || 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <PageHeader 
        title="Broadcast Messages" 
        description="Send announcements and updates to multiple institutions at once."
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Notifications' }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Use {'{SchoolName}'} to personalize the message for each recipient.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input 
                  placeholder="e.g. Important Platform Update" 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea 
                  rows={8} 
                  placeholder="Hello {SchoolName}, we have an update..." 
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  className="bg-background resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-soft border-border/50">
            <CardHeader>
              <CardTitle>Targeting & Delivery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-3">
                <Label className="text-base">Recipients</Label>
                <RadioGroup value={recipientType} onValueChange={setRecipientType} className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="all_schools" id="r1" />
                    <Label htmlFor="r1" className="flex-1 cursor-pointer font-medium">All Schools</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="selected_schools" id="r2" />
                    <Label htmlFor="r2" className="flex-1 cursor-pointer font-medium">
                      Selected Schools {selectedSchoolsCount > 0 ? `(${selectedSchoolsCount})` : ''}
                    </Label>
                  </div>
                </RadioGroup>
                {recipientType === 'selected_schools' && (
                  <div className="max-h-56 overflow-y-auto border rounded-lg p-3 bg-background space-y-2">
                    {loadingSchools ? (
                      <p className="text-sm text-muted-foreground">Loading schools...</p>
                    ) : schools.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No schools found.</p>
                    ) : (
                      schools.map((school) => (
                        <label key={school.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSchoolIds.includes(school.id)}
                            onChange={() => toggleSchool(school.id)}
                          />
                          <span>{school.schoolName}</span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-base">Delivery Channel</Label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={channels.includes('in_app')} onChange={() => toggleChannel('in_app')} />
                    <BellRing className="w-4 h-4 text-muted-foreground" /> In-app
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={channels.includes('email')} onChange={() => toggleChannel('email')} />
                    <Mail className="w-4 h-4 text-muted-foreground" /> Email
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={channels.includes('whatsapp')} onChange={() => toggleChannel('whatsapp')} />
                    <MessageSquare className="w-4 h-4 text-muted-foreground" /> WhatsApp
                  </label>
                </div>
              </div>

              <Button onClick={handleSend} disabled={loading || !message || !subject} className="w-full h-12 text-base">
                {loading ? 'Processing...' : <><Send className="w-4 h-4 mr-2" /> Send Broadcast</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-soft border-border/50 bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"><AlertCircle className="w-5 h-5 mr-2 text-primary" /> Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <p className="text-sm font-semibold border-b pb-3 mb-3 text-foreground">
                  <span className="text-muted-foreground font-normal mr-2">Subject:</span> 
                  {subject || 'No subject'}
                </p>
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {message ? message.replace(/{SchoolName}/g, 'Sample Academy') : <span className="text-muted-foreground italic">Message body will appear here...</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default BulkNotificationPage;
