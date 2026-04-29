
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, School, Users, ChevronRight, Loader2 } from 'lucide-react';
import pb from '@/lib/apiClient';
import { useDebounce } from '@/hooks/useDebounce.js';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const GlobalSearchBar = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState({ pdfs: [], schools: [], users: [] });
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults({ pdfs: [], schools: [], users: [] });
        return;
      }

      setLoading(true);
      try {
        const filter = `id != ""`; // Basic base filter
        const searchFilter = `~ "${debouncedQuery}"`;
        
        const [pdfRes, schoolRes, userRes] = await Promise.all([
          pb.collection('pdfs').getList(1, 3, { filter: `fileName ${searchFilter}`, $autoCancel: false }),
          pb.collection('schools').getList(1, 2, { filter: `schoolName ${searchFilter}`, $autoCancel: false }),
          pb.collection('users').getList(1, 2, { filter: `name ${searchFilter} || email ${searchFilter}`, $autoCancel: false })
        ]);

        setResults({
          pdfs: pdfRes.items,
          schools: schoolRes.items,
          users: userRes.items
        });
        setIsOpen(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path) => {
    setIsOpen(false);
    setQuery('');
    navigate(path);
  };

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      handleNavigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const hasResults = results.pdfs.length > 0 || results.schools.length > 0 || results.users.length > 0;

  return (
    <div className="relative w-full max-w-md" ref={wrapperRef}>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
        <Input 
          placeholder="Search resources, schools, users... (Press Enter)" 
          className="pl-9 pr-4 bg-muted/30 border-transparent focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 rounded-full h-10 transition-all shadow-none"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setIsOpen(true);
          }}
          onKeyDown={handleSearchSubmit}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
        />
      </div>

      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/60 shadow-soft-xl rounded-[var(--radius-lg)] overflow-hidden z-50 animate-fade-in flex flex-col max-h-[70vh]">
          <div className="overflow-y-auto p-2">
            {!loading && !hasResults && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No results found for "{query}"
              </div>
            )}

            {results.pdfs.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Resources</div>
                {results.pdfs.map(pdf => (
                  <button 
                    key={pdf.id} 
                    onClick={() => handleNavigate(`/search?q=${encodeURIComponent(pdf.fileName)}`)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 rounded-[var(--radius-md)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-rose-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pdf.fileName}</p>
                      <p className="text-xs text-muted-foreground truncate">{(pdf.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {results.schools.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schools</div>
                {results.schools.map(school => (
                  <button 
                    key={school.id} 
                    onClick={() => handleNavigate(`/admin/schools`)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 rounded-[var(--radius-md)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <School className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{school.schoolName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {results.users.length > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</div>
                {results.users.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => handleNavigate(`/admin/schools-and-users`)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 rounded-[var(--radius-md)] transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 text-secondary font-semibold text-xs">
                      {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name || 'Unnamed User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => handleNavigate(`/search?q=${encodeURIComponent(query)}`)}
            className="p-3 bg-muted/30 border-t border-border/50 text-sm font-medium text-primary hover:bg-muted/50 flex items-center justify-center transition-colors"
          >
            View all results <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;
