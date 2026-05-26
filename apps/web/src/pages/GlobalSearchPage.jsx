import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import pb from '@/lib/apiClient';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, FileText, School, Filter } from 'lucide-react';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import { getPdfCode } from '@/lib/utils';

const PLATFORM_ROLES = ['platform_admin', 'admin', 'moderator', 'platform_viewer'];

const GlobalSearchPage = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const { currentUser } = useAuth();
  const isPlatform = currentUser && PLATFORM_ROLES.includes(currentUser.role);

  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState({ pdfs: [], categories: [], schools: [], users: [] });

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ pdfs: [], categories: [], schools: [], users: [] });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        if (isPlatform) {
          const searchFilter = query;
          const [pdfRes, schoolRes, userRes] = await Promise.all([
            pb.collection('pdfs').getList(1, 20, { q: searchFilter, $autoCancel: false }),
            pb.collection('schools').getList(1, 10, { filter: searchFilter, $autoCancel: false }),
            pb.collection('users').getList(1, 10, { filter: searchFilter, $autoCancel: false })
          ]);
          setResults({
            pdfs: pdfRes.items,
            categories: [],
            schools: schoolRes.items,
            users: userRes.items
          });
        } else {
          const data = await pb.fetch('/search', 'GET', null, { q: query, per_page: 30 });
          setResults({
            pdfs: data.pdfs?.items || [],
            categories: data.categories?.items || [],
            schools: [],
            users: []
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, isPlatform]);

  const totalResults =
    results.pdfs.length + results.categories.length + results.schools.length + results.users.length;

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-poppins font-bold text-foreground">Search Results</h1>
        <p className="text-muted-foreground mt-1">
          {loading ? 'Searching...' : `Found ${totalResults} results for "${query}"`}
        </p>
        {!isPlatform && (
          <p className="text-xs text-muted-foreground mt-2">
            Results are limited to categories assigned to your school.
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0 space-y-6">
          <Card className="shadow-soft-sm border-border/50">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Resources ({results.pdfs.length})
              </Button>
              {results.categories.length > 0 && (
                <Button variant="ghost" className="w-full justify-start">
                  Categories ({results.categories.length})
                </Button>
              )}
              {isPlatform && (
                <>
                  <Button variant="ghost" className="w-full justify-start">
                    Schools ({results.schools.length})
                  </Button>
                  <Button variant="ghost" className="w-full justify-start">
                    Users ({results.users.length})
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 space-y-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : totalResults === 0 ? (
            <Card className="p-12 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
              <p className="text-lg font-medium">No results found</p>
            </Card>
          ) : (
            <>
              {results.categories.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4">Categories</h2>
                  <div className="grid gap-3">
                    {results.categories.map((cat) => (
                      <Card key={cat.id}>
                        <CardContent className="p-4 flex justify-between items-center">
                          <span>{cat.categoryName || cat.category_name}</span>
                          <Link to="/school/portal/browse">
                            <Button size="sm" variant="outline">
                              Browse
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {results.pdfs.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Resources
                  </h2>
                  <div className="grid gap-3">
                    {results.pdfs.map((pdf) => (
                      <Card key={pdf.id} className="hover:shadow-soft-md transition-base">
                        <CardContent className="p-4 flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{pdf.fileName || pdf.file_name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{getPdfCode(pdf) ?? '—'}</p>
                          </div>
                          {isPlatform ? (
                            <Link to="/admin/content-dashboard">
                              <Button size="sm">View</Button>
                            </Link>
                          ) : (
                            <Link to="/school/portal/browse">
                              <Button size="sm">Open portal</Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {isPlatform && results.schools.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <School className="w-5 h-5" /> Schools
                  </h2>
                  <div className="grid gap-3">
                    {results.schools.map((school) => (
                      <Card key={school.id}>
                        <CardContent className="p-4">
                          <p className="font-semibold">{school.schoolName || school.school_name}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default GlobalSearchPage;
