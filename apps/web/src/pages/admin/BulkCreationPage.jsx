import React, { useState, useRef } from 'react';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import Papa from 'papaparse';

// ── Template definitions ──────────────────────────────────────────────────────

const SCHOOL_COLUMNS = ['schoolName', 'email', 'pointOfContactName', 'mobileNumber', 'location', 'address', 'grades'];
const USER_COLUMNS = ['name', 'email', 'role', 'schoolId', 'mobileNumber'];
const USER_ROLES = ['platform_admin', 'platform_viewer', 'school_admin', 'school_viewer', 'teacher'];

const downloadCSV = (columns, sampleRows, filename) => {
    const csv = [columns.join(','), ...sampleRows.map(r => columns.map(c => r[c] ?? '').join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const SCHOOL_SAMPLE = [
    { schoolName: 'Lincoln High School', email: 'admin@lincoln.edu', pointOfContactName: 'Dr. Jane Smith', mobileNumber: '+1-555-0100', location: 'Seattle, WA', address: '123 Main St', grades: '6-10' },
];

const USER_SAMPLE = [
    { name: 'John Doe', email: 'john@school.edu', role: 'school_admin', schoolId: 'SCH-XXXXXX', mobileNumber: '+1-555-0200' },
    { name: 'Jane Viewer', email: 'jane@platform.com', role: 'platform_viewer', schoolId: '', mobileNumber: '' },
];

// ── Result table ──────────────────────────────────────────────────────────────

const ResultTable = ({ results }) => (
    <div className="rounded-lg border border-border/50 overflow-hidden mt-4">
        <Table>
            <TableHeader className="bg-muted/30">
                <TableRow>
                    <TableHead>Name / Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Details</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {results.map((r, i) => (
                    <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{r.schoolName || r.name || r.email}</TableCell>
                        <TableCell>
                            {r.status === 'created'
                                ? <Badge className="bg-emerald-500/10 text-emerald-600 border-none"><CheckCircle2 className="w-3 h-3 mr-1" />Created</Badge>
                                : <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Error</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {r.status === 'created'
                                ? `ID: ${r.schoolId || '—'} | Pwd: ${r.generatedPassword || '—'}`
                                : r.error}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const BulkCreationPage = () => {
    const { isPlatformAdmin, canWrite } = useAuth();
    const [activeTab, setActiveTab] = useState('schools');

    const [schoolFile, setSchoolFile] = useState(null);
    const [schoolParsed, setSchoolParsed] = useState([]);
    const [schoolResults, setSchoolResults] = useState([]);
    const [schoolUploading, setSchoolUploading] = useState(false);

    const [userFile, setUserFile] = useState(null);
    const [userParsed, setUserParsed] = useState([]);
    const [userResults, setUserResults] = useState([]);
    const [userUploading, setUserUploading] = useState(false);

    const schoolInputRef = useRef();
    const userInputRef = useRef();

    const parseCSV = (file, setter) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (res) => {
                setter(res.data);
                toast.success(`Parsed ${res.data.length} rows`);
            },
            error: () => toast.error('Failed to parse file'),
        });
    };

    const handleSchoolFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setSchoolFile(f);
        setSchoolResults([]);
        parseCSV(f, setSchoolParsed);
    };

    const handleUserFile = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUserFile(f);
        setUserResults([]);
        parseCSV(f, setUserParsed);
    };

    const uploadSchools = async () => {
        if (!schoolParsed.length) return;
        setSchoolUploading(true);
        try {
            const token = pb.authStore.token;
            const resp = await fetch('/api/schools/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ schools: schoolParsed }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.detail || 'Server error');
            }
            const data = await resp.json();
            setSchoolResults(data.results || []);
            toast.success(`${data.created} of ${data.total} schools created`);
        } catch (e) {
            toast.error('Bulk school creation failed: ' + e.message);
        } finally {
            setSchoolUploading(false);
        }
    };

    const uploadUsers = async () => {
        if (!userParsed.length) return;
        setUserUploading(true);
        try {
            const token = pb.authStore.token;
            const resp = await fetch('/api/bulk/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ users: userParsed }),
            });
            const data = await resp.json();
            setUserResults(data.results || []);
            toast.success(`${data.created} of ${data.total} users created`);
        } catch (e) {
            toast.error('Bulk user creation failed');
        } finally {
            setUserUploading(false);
        }
    };

    if (!canWrite) {
        return (
            <PageTransition>
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
                    <p className="text-muted-foreground mt-2">Only platform admins can perform bulk creation.</p>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="mb-6">
                <h1 className="text-3xl font-poppins font-bold text-foreground">Bulk Creation</h1>
                <p className="text-muted-foreground mt-1">Upload CSV files to create multiple schools or users at once.</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/30 p-1 mb-6">
                    <TabsTrigger value="schools" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Building2 className="w-4 h-4 mr-2" /> Schools
                    </TabsTrigger>
                    <TabsTrigger value="users" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Users className="w-4 h-4 mr-2" /> Users
                    </TabsTrigger>
                </TabsList>

                {/* ── Schools Tab ── */}
                <TabsContent value="schools">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Step 1 — Download Template
                                </CardTitle>
                                <CardDescription>Fill in the CSV template with school data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p className="font-medium text-foreground">Required columns:</p>
                                    {SCHOOL_COLUMNS.map(c => <p key={c} className="font-mono text-xs">• {c}</p>)}
                                </div>
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                                    School ID is auto-generated — do not include it in the file.
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => downloadCSV(SCHOOL_COLUMNS, SCHOOL_SAMPLE, 'schools_template.csv')}>
                                    <Download className="w-4 h-4 mr-2" /> Download Schools Template
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Upload className="w-5 h-5 text-primary" /> Step 2 — Upload & Create
                                </CardTitle>
                                <CardDescription>Upload your filled CSV to create schools.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <input ref={schoolInputRef} type="file" accept=".csv" className="hidden" onChange={handleSchoolFile} />
                                <Button variant="outline" className="w-full" onClick={() => schoolInputRef.current?.click()}>
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    {schoolFile ? schoolFile.name : 'Choose CSV File'}
                                </Button>
                                {schoolParsed.length > 0 && (
                                    <p className="text-sm text-muted-foreground">{schoolParsed.length} rows ready to import</p>
                                )}
                                <Button className="w-full" onClick={uploadSchools} disabled={!schoolParsed.length || schoolUploading}>
                                    {schoolUploading ? 'Creating...' : `Create ${schoolParsed.length || ''} Schools`}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {schoolResults.length > 0 && (
                        <Card className="mt-6 shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResultTable results={schoolResults} />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* ── Users Tab ── */}
                <TabsContent value="users">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card className="shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Step 1 — Download Template
                                </CardTitle>
                                <CardDescription>Fill in the CSV template with user data.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <p className="font-medium text-foreground">Required columns:</p>
                                    {USER_COLUMNS.map(c => <p key={c} className="font-mono text-xs">• {c}</p>)}
                                    <p className="font-medium text-foreground mt-2">Valid roles:</p>
                                    {USER_ROLES.map(r => <p key={r} className="font-mono text-xs">• {r}</p>)}
                                </div>
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
                                    School roles (school_admin, school_viewer, teacher) require a valid schoolId. Platform roles leave schoolId blank.
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => downloadCSV(USER_COLUMNS, USER_SAMPLE, 'users_template.csv')}>
                                    <Download className="w-4 h-4 mr-2" /> Download Users Template
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Upload className="w-5 h-5 text-primary" /> Step 2 — Upload & Create
                                </CardTitle>
                                <CardDescription>Upload your filled CSV to create users.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <input ref={userInputRef} type="file" accept=".csv" className="hidden" onChange={handleUserFile} />
                                <Button variant="outline" className="w-full" onClick={() => userInputRef.current?.click()}>
                                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                                    {userFile ? userFile.name : 'Choose CSV File'}
                                </Button>
                                {userParsed.length > 0 && (
                                    <p className="text-sm text-muted-foreground">{userParsed.length} rows ready to import</p>
                                )}
                                <Button className="w-full" onClick={uploadUsers} disabled={!userParsed.length || userUploading}>
                                    {userUploading ? 'Creating...' : `Create ${userParsed.length || ''} Users`}
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    {userResults.length > 0 && (
                        <Card className="mt-6 shadow-soft-md border-border/50">
                            <CardHeader>
                                <CardTitle className="text-base">Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResultTable results={userResults} />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </PageTransition>
    );
};

export default BulkCreationPage;
