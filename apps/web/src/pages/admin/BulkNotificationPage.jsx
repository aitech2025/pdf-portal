
import React, { useEffect, useMemo, useState } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageTransition from '@/components/PageTransition.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import { Send, Mail, MessageSquare, AlertCircle, BellRing, ChevronDown, CheckCircle2, XCircle, Settings, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const EMAIL_TEMPLATES = [
  {
    name: 'General Announcement',
    subject: 'Important Announcement from i-icon Academy',
    message: `Dear {SchoolName},

We have an important update to share with you.

[Your message here]

Please log in to the portal for more details.

Best regards,
i-icon Academy Team`,
  },
  {
    name: 'New Content Available',
    subject: 'New Educational Content on i-icon Academy',
    message: `Dear {SchoolName},

We are pleased to inform you that new educational content has been added to your program on i-icon Academy.

Please log in to explore the latest materials available for your students.

Best regards,
i-icon Academy Team`,
  },
  {
    name: 'Scheduled Maintenance',
    subject: 'Scheduled Maintenance — i-icon Academy',
    message: `Dear {SchoolName},

Please be informed that i-icon Academy will undergo scheduled maintenance on [Date] from [Time] to [Time].

During this period, access to the platform may be temporarily unavailable. We apologise for any inconvenience caused.

Best regards,
i-icon Academy Team`,
  },
  {
    name: 'Renewal / Subscription',
    subject: 'Subscription Renewal Reminder — i-icon Academy',
    message: `Dear {SchoolName},

This is a friendly reminder that your subscription on i-icon Academy is due for renewal on [Date].

Please contact us to ensure uninterrupted access to all educational resources.

Best regards,
i-icon Academy Team`,
  },
];

const WHATSAPP_TEMPLATES = [
  {
    name: 'General Announcement',
    message: `Dear {SchoolName}, we have an important update from i-icon Academy. Please log in to the portal or check your email for full details. — i-icon Academy Team`,
  },
  {
    name: 'New Content',
    message: `Dear {SchoolName}, new educational content is now available on i-icon Academy for your program. Log in to explore the latest materials! — i-icon Academy Team`,
  },
  {
    name: 'Maintenance Notice',
    message: `Dear {SchoolName}, i-icon Academy will undergo scheduled maintenance on [Date] from [Time] to [Time]. Access may be temporarily unavailable. We apologise for any inconvenience. — i-icon Academy Team`,
  },
  {
    name: 'Renewal Reminder',
    message: `Dear {SchoolName}, your i-icon Academy subscription is due for renewal on [Date]. Please contact us at support@iiconacademy.in to ensure uninterrupted access. — i-icon Academy Team`,
  },
];

const BulkNotificationPage = () => {
  const navigate = useNavigate();

  // Compose state per channel
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [waMessage, setWaMessage] = useState('');
  const [includeInApp, setIncludeInApp] = useState(true);

  // Targeting
  const [recipientType, setRecipientType] = useState('all_schools');
  const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [loading, setLoading] = useState(false);

  // Template dropdowns
  const [showEmailTemplates, setShowEmailTemplates] = useState(false);
  const [showWaTemplates, setShowWaTemplates] = useState(false);

  // WhatsApp Cloud API status
  const [waStatus, setWaStatus] = useState(null);
  const [waStatusLoading, setWaStatusLoading] = useState(true);

  useEffect(() => {
    const loadSchools = async () => {
      try {
        setLoadingSchools(true);
        const res = await client.fetch('/schools', 'GET', null, { per_page: 500, sort: 'schoolName' });
        setSchools(res.items || []);
      } catch {
        toast.error('Failed to load schools');
      } finally {
        setLoadingSchools(false);
      }
    };
    const loadWaStatus = async () => {
      try {
        const res = await client.fetch('/whatsapp/status', 'GET');
        setWaStatus(res);
      } catch {
        setWaStatus(null);
      } finally {
        setWaStatusLoading(false);
      }
    };
    loadSchools();
    loadWaStatus();
  }, []);

  const selectedSchoolsCount = useMemo(() => selectedSchoolIds.length, [selectedSchoolIds]);

  const waConfigured = waStatus?.configured === true;
  const waEnabled = waStatus?.enabled === true || waStatus?.source === 'env';
  const waReady = waConfigured && waEnabled;
  const waFromEnv = waStatus?.source === 'env';

  const toggleSchool = (id) => {
    setSelectedSchoolIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const applyEmailTemplate = (tpl) => {
    setEmailSubject(tpl.subject);
    setEmailMessage(tpl.message);
    setShowEmailTemplates(false);
  };

  const applyWaTemplate = (tpl) => {
    setWaMessage(tpl.message);
    setShowWaTemplates(false);
  };

  const handleSend = async (channelType) => {
    const isEmail = channelType === 'email';
    const subject = isEmail ? emailSubject : 'WhatsApp Message';
    const message = isEmail ? emailMessage : waMessage;

    if (!message || (isEmail && !emailSubject)) {
      toast.error(isEmail ? 'Subject and message are required' : 'Message is required');
      return;
    }
    if (recipientType === 'selected_schools' && !selectedSchoolIds.length) {
      toast.error('Please select at least one school');
      return;
    }

    const channels = isEmail
      ? (includeInApp ? ['email', 'in_app'] : ['email'])
      : (includeInApp ? ['whatsapp', 'in_app'] : ['whatsapp']);

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
        `Sent to ${result.totalRecipients} recipients (${result.sent} delivered, ${result.failed} failed)`
      );
      if (isEmail) { setEmailSubject(''); setEmailMessage(''); }
      else setWaMessage('');
      setSelectedSchoolIds([]);
    } catch (err) {
      toast.error(err.message || 'Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  const TargetingPanel = () => (
    <Card className="shadow-soft border-border/50">
      <CardHeader>
        <CardTitle>Targeting & Delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base">Recipients</Label>
          <RadioGroup value={recipientType} onValueChange={setRecipientType} className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="all_schools" id="r1" />
              <Label htmlFor="r1" className="flex-1 cursor-pointer font-medium">All Schools & Colleges</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
              <RadioGroupItem value="selected_schools" id="r2" />
              <Label htmlFor="r2" className="flex-1 cursor-pointer font-medium">
                Selected Institutions {selectedSchoolsCount > 0 ? `(${selectedSchoolsCount})` : ''}
              </Label>
            </div>
          </RadioGroup>
          {recipientType === 'selected_schools' && (
            <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-background space-y-2">
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

        <div className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            id="inapp-toggle"
            checked={includeInApp}
            onChange={(e) => setIncludeInApp(e.target.checked)}
          />
          <label htmlFor="inapp-toggle" className="cursor-pointer flex items-center gap-1.5">
            <BellRing className="w-4 h-4 text-muted-foreground" />
            Also send as in-app notification
          </label>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <PageTransition>
      <PageHeader
        title="Broadcast Messages"
        description="Send announcements and updates to multiple institutions at once."
        breadcrumbs={[{ label: 'Dashboard', path: '/admin' }, { label: 'Broadcast' }]}
      />

      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </TabsTrigger>
        </TabsList>

        {/* ── EMAIL TAB ─────────────────────────────────────── */}
        <TabsContent value="email" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Compose Email</CardTitle>
                      <CardDescription>Use {'{SchoolName}'} to personalise for each recipient.</CardDescription>
                    </div>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowEmailTemplates(v => !v)}
                        className="flex items-center gap-1.5"
                      >
                        Templates <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showEmailTemplates && "rotate-180")} />
                      </Button>
                      {showEmailTemplates && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border bg-card shadow-lg">
                          {EMAIL_TEMPLATES.map(tpl => (
                            <button
                              key={tpl.name}
                              onClick={() => applyEmailTemplate(tpl)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Subject Line</Label>
                    <Input
                      placeholder="e.g. Important Platform Update"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message Body</Label>
                    <Textarea
                      rows={10}
                      placeholder="Hello {SchoolName}, we have an update..."
                      value={emailMessage}
                      onChange={e => setEmailMessage(e.target.value)}
                      className="bg-background resize-none font-mono text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              <TargetingPanel />

              <Button
                onClick={() => handleSend('email')}
                disabled={loading || !emailMessage || !emailSubject}
                className="w-full h-12 text-base"
              >
                {loading ? 'Sending…' : <><Send className="w-4 h-4 mr-2" /> Send Email Broadcast</>}
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="shadow-soft border-border/50 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <AlertCircle className="w-5 h-5 mr-2 text-primary" /> Email Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
                    <p className="text-sm font-semibold border-b pb-3 mb-3 text-foreground">
                      <span className="text-muted-foreground font-normal mr-2">Subject:</span>
                      {emailSubject || <span className="text-muted-foreground italic">No subject</span>}
                    </p>
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {emailMessage
                        ? emailMessage.replace(/{SchoolName}/g, 'Sample Academy')
                        : <span className="text-muted-foreground italic">Email body will appear here…</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Email Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Use <Badge variant="secondary" className="text-xs font-mono">{'{SchoolName}'}</Badge> for personalisation</p>
                  <p>• Keep subject lines under 60 characters</p>
                  <p>• Ensure SMTP settings are configured in Settings</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── WHATSAPP TAB ───────────────────────────────────── */}
        <TabsContent value="whatsapp" className="space-y-0">
          {/* Cloud API status banner */}
          {waStatusLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-3 rounded-lg border border-border/50 bg-muted/20">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking WhatsApp configuration…
            </div>
          ) : !waReady ? (
            <div className="flex items-start gap-3 mb-4 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-sm text-destructive">
                  {!waConfigured ? 'WhatsApp Cloud API not configured' : 'WhatsApp messaging is disabled'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {!waConfigured
                    ? 'Set your Phone Number ID and Access Token in Settings → WhatsApp before sending broadcasts.'
                    : 'Enable WhatsApp messaging in Settings → WhatsApp to send broadcasts.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/settings?tab=whatsapp')}
                className="shrink-0 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" /> Configure
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                WhatsApp Cloud API is active
                {waFromEnv ? ' (credentials from environment variables)' : ` · Phone ID: ${waStatus?.phoneNumberId}`}.
                Broadcasts use the <code className="font-mono text-xs bg-emerald-500/10 px-1 rounded">broadcast_announcement</code> template.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Compose WhatsApp Message</CardTitle>
                      <CardDescription>
                        Use <code className="font-mono text-xs bg-muted px-1 rounded">{'{SchoolName}'}</code> to personalise.
                        Your message is sent as the <code className="font-mono text-xs bg-muted px-1 rounded">broadcast_announcement</code> template parameter.
                      </CardDescription>
                    </div>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWaTemplates(v => !v)}
                        className="flex items-center gap-1.5"
                      >
                        Templates <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showWaTemplates && "rotate-180")} />
                      </Button>
                      {showWaTemplates && (
                        <div className="absolute right-0 top-full mt-1 z-20 w-56 rounded-lg border bg-card shadow-lg">
                          {WHATSAPP_TEMPLATES.map(tpl => (
                            <button
                              key={tpl.name}
                              onClick={() => applyWaTemplate(tpl)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg"
                            >
                              {tpl.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      rows={10}
                      placeholder="Dear {SchoolName}, ..."
                      value={waMessage}
                      onChange={e => setWaMessage(e.target.value)}
                      className="bg-background resize-none text-sm"
                      disabled={!waReady}
                    />
                    <p className={cn("text-xs text-right", waMessage.length > 900 ? "text-amber-500 font-medium" : "text-muted-foreground")}>
                      {waMessage.length} / 1024 characters
                    </p>
                  </div>
                </CardContent>
              </Card>

              <TargetingPanel />

              <Button
                onClick={() => handleSend('whatsapp')}
                disabled={loading || !waMessage || !waReady}
                className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? 'Sending…' : <><MessageSquare className="w-4 h-4 mr-2" /> Send WhatsApp Broadcast</>}
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="shadow-soft border-border/50 bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <AlertCircle className="w-5 h-5 mr-2 text-green-600" /> WhatsApp Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#dcf8c6] dark:bg-green-900/30 rounded-xl p-4 shadow-sm max-w-xs">
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {waMessage
                        ? waMessage.replace(/{SchoolName}/g, 'Sample Academy')
                        : <span className="text-muted-foreground italic">Message will appear here…</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground text-right mt-2">i-icon Academy</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>• Use <Badge variant="secondary" className="text-xs font-mono">{'{SchoolName}'}</Badge> for personalisation</p>
                  <p>• Sent via Meta Cloud API using the <code className="text-xs font-mono bg-muted px-1 rounded">broadcast_announcement</code> template</p>
                  <p>• Messages reach schools even without a prior 24-hour service window</p>
                  <p>• Keep message under 1024 characters (template parameter limit)</p>
                  <p>• Delivered to the school's registered mobile number</p>
                  <p>• Configure credentials in <button onClick={() => navigate('/admin/settings?tab=whatsapp')} className="text-primary hover:underline">Settings → WhatsApp</button></p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
};

export default BulkNotificationPage;
