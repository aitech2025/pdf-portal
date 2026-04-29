
import React, { useState } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { Send, Mail, MessageSquare, AlertCircle } from 'lucide-react';

const BulkNotificationPage = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipientType, setRecipientType] = useState('all_active');
  const [channel, setChannel] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!subject || !message) {
      toast.error('Subject and message are required');
      return;
    }
    
    setLoading(true);
    try {
      let filter = '';
      if (recipientType === 'all_active') filter = 'isActive=true';
      else if (recipientType === 'all_inactive') filter = 'isActive=false';
      
      const schools = await pb.collection('schools').getList(1, 500, { filter, $autoCancel: false });
      
      if (schools.items.length === 0) {
        toast.warning('No schools found matching the criteria');
        setLoading(false);
        return;
      }

      let count = 0;
      for (const school of schools.items) {
        const personalizedMsg = message.replace(/{SchoolName}/g, school.schoolName);
        
        // Find admin user for this school
        const users = await pb.collection('users').getList(1, 1, { filter: `schoolId="${school.id}"`, $autoCancel: false });
        if (users.items.length > 0) {
          await pb.collection('notifications').create({
            recipientId: users.items[0].id,
            type: 'bulk_announcement',
            subject: subject,
            message: personalizedMsg,
            notificationMethod: channel,
            status: 'pending'
          }, { $autoCancel: false });
          count++;
        }
      }
      
      toast.success(`Successfully queued ${count} notifications`);
      setSubject('');
      setMessage('');
    } catch (err) {
      toast.error('Failed to send notifications');
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
                    <RadioGroupItem value="all_active" id="r1" />
                    <Label htmlFor="r1" className="flex-1 cursor-pointer font-medium">All Active Schools</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="all_inactive" id="r2" />
                    <Label htmlFor="r2" className="flex-1 cursor-pointer font-medium">Deactivated Schools Only</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label className="text-base">Delivery Channel</Label>
                <RadioGroup value={channel} onValueChange={setChannel} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="email" id="c1" />
                    <Label htmlFor="c1" className="flex items-center cursor-pointer"><Mail className="w-4 h-4 mr-2 text-muted-foreground" /> Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="whatsapp" id="c2" />
                    <Label htmlFor="c2" className="flex items-center cursor-pointer"><MessageSquare className="w-4 h-4 mr-2 text-muted-foreground" /> WhatsApp</Label>
                  </div>
                </RadioGroup>
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
