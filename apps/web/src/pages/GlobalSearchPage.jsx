
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, School, Users, Filter, Download, ArrowRight } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';

const GlobalSearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ pdfs: [], schools: [], users: [] });

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ pdfs: [], schools: [], users: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchFilter = query;
        const [pdfRes, schoolRes, userRes] = await Promise.all([
          pb.collection('pdfs').getList(1, 20, { filter: searchFilter, expand: 'categoryId', $autoCancel: false }),
          pb.collection('schools').getList(1, 10, { filter: searchFilter, $autoCancel: false }),
          pb.collection('users').getList(1, 10, { filter: searchFilter, $autoCancel: false })
        ]);

        setResults({
          pdfs: pdfRes.items,
          schools: schoolRes.items,
          users: userRes.items
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  const totalResults = results.pdfs.length + results.schools.length + results.users.length;

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Search Results</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Searching...' : `Found ${totalResults} results for "${query}"`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar - simplified for token constraints */}
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-sm text-muted-foreground">Advanced filtering available in full version.</div>
              <Button variant="outline" className="w-full justify-start">Resources ({results.pdfs.length})</Button>
              <Button variant="ghost" className="w-full justify-start">Schools ({results.schools.length})</Button>
              <Button variant="ghost" className="w-full justify-start">Users ({results.users.length})</Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        <div className="flex-1 space-y-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-[var(--radius-lg)]" />)}
            </div>
          ) : totalResults === 0 ? (
            <div className="py-20 text-center border border-dashed rounded-[var(--radius-lg)] bg-card shadow-soft-sm">
              <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-xl font-poppins font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms or filters.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {results.pdfs.length > 0 && (
                <section>
                  <h3 className="text-xl font-poppins font-bold text-foreground mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-primary" /> Resources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.pdfs.map(pdf => (
                      <Card key={pdf.id} className="shadow-soft-sm hover:shadow-soft-md transition-base border-border/50 overflow-hidden group">
                        <CardContent className="p-4 flex gap-4">
                          <div className="w-16 h-16 rounded-[var(--radius-md)] bg-rose-500/10 flex items-center justify-center shrink-0">
                            <FileText className="w-8 h-8 text-rose-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{pdf.fileName}</h4>
                            <p className="text-xs text-muted-foreground mt-1 mb-2">
                              {pdf.expand?.categoryId?.categoryName || 'General'} • {(pdf.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <div className="flex gap-2 mt-auto">
                              <Badge variant="outline" className="text-[10px]">PDF</Badge>
                              <Badge variant="outline" className="text-[10px]">{new Date(pdf.created).getFullYear()}</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {results.schools.length > 0 && (
                <section>
                  <h3 className="text-xl font-poppins font-bold text-foreground mb-4 flex items-center">
                    <School className="w-5 h-5 mr-2 text-secondary" /> Schools
                  </h3>
                  <div className="space-y-3">
                    {results.schools.map(school => (
                      <Card key={school.id} className="shadow-soft-sm hover:shadow-soft-md transition-base border-border/50 p-4 flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{school.schoolName}</h4>
                          <p className="text-sm text-muted-foreground">{school.email} • {school.location || 'No location'}</p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/admin/schools">View <ArrowRight className="w-4 h-4 ml-2" /></Link>
                        </Button>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default GlobalSearchPage;
