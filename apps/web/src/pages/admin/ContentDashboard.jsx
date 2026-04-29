
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, BookOpen, FolderTree, UploadCloud, ArrowRight, HardDrive, BarChart3, Star, DownloadCloud, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '@/components/PageTransition.jsx';
import { Skeleton } from '@/components/ui/skeleton';
import EnhancedPDFViewer from '@/components/EnhancedPDFViewer.jsx';
import VersionHistoryModal from '@/components/admin/pdfs/VersionHistoryModal.jsx';
import { formatBytes, cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const ContentDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [pdfs, cats, subCats] = await Promise.all([
        pb.collection('pdfs').getList(1, 8, { sort: '-created', expand: 'categoryId', $autoCancel: false }),
        pb.collection('categories').getList(1, 4, { sort: '-created', $autoCancel: false }),
        pb.collection('subCategories').getList(1, 1, { $autoCancel: false }),
      ]);

      const storageUsageMB = (pdfs.totalItems * 2.4).toFixed(1);

      setStats({
        totalPdfs: pdfs.totalItems,
        totalCategories: cats.totalItems,
        totalSubCategories: subCats.totalItems,
        storageUsage: `${storageUsageMB} MB`
      });

      const enhancedPdfs = pdfs.items.map(pdf => ({
        ...pdf,
        mockRating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
        mockDownloads: Math.floor(Math.random() * 500)
      }));

      setRecentUploads(enhancedPdfs);
      setCategories(cats.items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }) => (
    <Card className="shadow-soft-sm hover:shadow-soft-md transition-base border-none overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${bgClass} blur-2xl -mr-6 -mt-6 opacity-60`}></div>
      <CardContent className="p-6 flex items-center gap-5">
        <div className={`w-14 h-14 rounded-[var(--radius-xl)] ${bgClass} flex items-center justify-center shrink-0`}>
          <Icon className={`w-7 h-7 ${colorClass}`} />
        </div>
        <div className="z-10">
          <p className="text-sm font-semibold text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-poppins font-bold text-foreground">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );

  if (selectedPdf && window.innerWidth < 1024) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col h-screen">
        <EnhancedPDFViewer 
          pdfRecord={selectedPdf} 
          onClose={() => setSelectedPdf(null)} 
          className="flex-1 rounded-none border-none shadow-none"
        />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground">Content Library</h1>
          <p className="text-muted-foreground mt-1">Manage and organize your educational materials.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/admin/analytics')} className="shadow-soft-sm bg-card">
            <BarChart3 className="w-4 h-4 mr-2" /> Reports
          </Button>
          <Button variant="gradient" onClick={() => navigate('/admin/pdf-upload')} className="shadow-soft-md">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-[var(--radius-lg)]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard title="Total PDFs" value={stats?.totalPdfs || 0} icon={FileText} colorClass="text-primary" bgClass="bg-primary/10" />
          <StatCard title="Categories" value={stats?.totalCategories || 0} icon={BookOpen} colorClass="text-secondary" bgClass="bg-secondary/10" />
          <StatCard title="Storage Used" value={stats?.storageUsage || "0 MB"} icon={HardDrive} colorClass="text-accent" bgClass="bg-accent/10" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
        <div className={cn("flex flex-col gap-8 transition-all duration-300", selectedPdf ? "lg:w-1/3" : "w-full")}>
          <Card className="shadow-soft-sm border-border/50 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-4 shrink-0 bg-card z-10 border-b border-border/30">
              <div>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Click a document to preview</CardDescription>
              </div>
              {!selectedPdf && (
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/pdf-upload')} className="text-primary hover:text-primary">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : recentUploads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground font-medium">No PDFs uploaded yet.</p>
                </div>
              ) : (
                <div className={cn("grid gap-0", selectedPdf ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 p-4 gap-4")}>
                  {recentUploads.map(pdf => (
                    <motion.div 
                      key={pdf.id}
                      whileHover={{ scale: selectedPdf ? 1 : 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPdf(pdf)}
                      className={cn(
                        "flex flex-col p-4 transition-all duration-200 cursor-pointer group relative overflow-hidden",
                        selectedPdf?.id === pdf.id 
                          ? "bg-primary/5 border-l-4 border-l-primary" 
                          : selectedPdf 
                            ? "border-b border-border/50 hover:bg-muted/30"
                            : "rounded-[var(--radius-md)] bg-card border border-border/50 hover:shadow-soft-md hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors",
                          selectedPdf?.id === pdf.id ? "bg-primary/10 text-primary" : "bg-rose-500/10 text-rose-500 group-hover:bg-rose-500/20"
                        )}>
                          <FileText className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-border text-muted-foreground font-mono">
                              {pdf.pdf_id || 'ID PENDING'}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] px-1.5 h-4 bg-primary/10 text-primary hover:bg-primary/20">
                              v{pdf.currentVersion || 1}
                            </Badge>
                          </div>
                          <p className={cn(
                            "text-sm font-semibold truncate transition-colors",
                            selectedPdf?.id === pdf.id ? "text-primary" : "text-foreground group-hover:text-primary"
                          )}>
                            {pdf.fileName}
                          </p>
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-sm border border-border/50 truncate max-w-[120px]">
                              {pdf.expand?.categoryId?.categoryName || 'Uncategorized'}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatBytes(pdf.fileSize)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!selectedPdf && (
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                            <span className="flex items-center text-amber-500"><Star className="w-3.5 h-3.5 mr-1 fill-amber-500" /> {pdf.mockRating}</span>
                            <span className="flex items-center"><DownloadCloud className="w-3.5 h-3.5 mr-1" /> {pdf.mockDownloads}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPdf(pdf);
                              setHistoryModalOpen(true);
                            }}
                          >
                            <History className="w-3 h-3 mr-1" /> History
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {!selectedPdf && (
            <Card className="shadow-soft-sm border-border/50 bg-card h-fit">
              <CardHeader className="pb-4">
                <CardTitle>Categories Structure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] border border-transparent hover:border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-secondary/20 flex items-center justify-center text-secondary-foreground">
                        <FolderTree className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{cat.categoryName}</p>
                        <p className="text-xs text-muted-foreground">{cat.categoryType}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/categories-management')} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className={cn(
          "hidden lg:flex transition-all duration-300", 
          selectedPdf ? "lg:w-2/3 h-auto min-h-[600px] opacity-100" : "w-0 opacity-0 overflow-hidden"
        )}>
          {selectedPdf && (
            <EnhancedPDFViewer 
              pdfRecord={selectedPdf} 
              onClose={() => setSelectedPdf(null)}
              className="h-full w-full"
            />
          )}
        </div>
      </div>

      <VersionHistoryModal 
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        pdf={selectedPdf}
        onVersionChanged={fetchData}
      />
    </PageTransition>
  );
};

export default ContentDashboard;
