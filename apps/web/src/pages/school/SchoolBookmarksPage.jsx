import React, { useEffect, useState } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bookmark, FileText } from 'lucide-react';
import { toast } from 'sonner';
import PageTransition from '@/components/PageTransition.jsx';
import LoadingSpinner from '@/components/LoadingSpinner.jsx';

const SchoolBookmarksPage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const res = await pb.fetch('/favorites', 'GET');
      setItems(res.items || []);
    } catch {
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (pdfId) => {
    try {
      await pb.fetch(`/favorites/${pdfId}`, 'DELETE');
      toast.success('Bookmark removed');
      load();
    } catch {
      toast.error('Could not remove bookmark');
    }
  };

  return (
    <PageTransition>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-poppins">Bookmarks</h1>
        <p className="text-muted-foreground">Saved PDFs for quick access</p>
      </div>
      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-40" />
            No bookmarks yet. Bookmark PDFs while browsing the resource portal.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {item.pdf?.fileName || item.pdf?.file_name || 'PDF'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{item.pdf?.pdfId || item.pdf?.pdf_id}</span>
                <Button variant="outline" size="sm" onClick={() => remove(item.pdfId || item.pdf?.id)}>
                  Remove
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageTransition>
  );
};

export default SchoolBookmarksPage;
