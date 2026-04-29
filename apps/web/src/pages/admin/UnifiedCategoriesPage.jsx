
import React, { useState, useMemo, useEffect } from 'react';
import { FolderTree, Search, Plus, MoreVertical, Edit2, Trash2, FileText, ChevronRight, Hash, Layers, CheckCircle2, XCircle, Menu, BookOpen, Users, Beaker, Compass, Lightbulb, Target, Award, Zap, Sparkles, Globe, Heart, Brain, Code, Palette, Music, Camera, Microscope, Atom, Dna, Rocket, Cpu, Database, Network, Shield, Lock, Key, Settings, Wrench, Hammer, Hammer as Drill, Sword as Saw, Ruler, Calculator, BarChart3, TrendingUp, PieChart, LineChart, Activity, HeartPulse as Pulse, Wind, Droplet, Flame, Leaf, Mountain, Sun, Moon, Star, Cloud, CloudRain, CloudSnow, Waves, Anchor, Map, Navigation, MapPin, Flag, Bookmark, Tag, Tag as Label, Badge, Grid, List, Table, Columns, Rows, Square, Circle, Triangle, Hexagon, Pentagon, Octagon, Diamond, Cross, Minus, X, Check, CheckCircle, AlertCircle, Info, HelpCircle, Bug as Question, Copy, Clipboard, Eye, EyeOff, Filter, Download, Upload, Share2, Link, Mail, MessageSquare, Phone, Video, Mic, Volume2, Volume, VolumeX, Headphones, Radio, Wifi, WifiOff, Bluetooth, Smartphone, Tablet, Monitor, Tv, Watch, HardDrive, Disc, Disc3, FlipHorizontal as Floppy, Save, Folder, FolderOpen, File, FileCode, FileImage, FileVideo, FileAudio, FileArchive, FileCheck, FileX, FileMinus, FilePlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import PageTransition from '@/components/PageTransition.jsx';
import { useCategoriesManagement } from '@/hooks/useCategoriesManagement.js';
import CategoryModal from '@/components/admin/categories/CategoryModal.jsx';
import SubCategoryModal from '@/components/admin/categories/SubCategoryModal.jsx';
import DeleteConfirmationDialog from '@/components/admin/categories/DeleteConfirmationDialog.jsx';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Static icon mapping object
const ICON_MAP = {
  'FolderTree': FolderTree,
  'FileText': FileText,
  'BookOpen': BookOpen,
  'Users': Users,
  'Beaker': Beaker,
  'Compass': Compass,
  'Lightbulb': Lightbulb,
  'Target': Target,
  'Award': Award,
  'Zap': Zap,
  'Sparkles': Sparkles,
  'Globe': Globe,
  'Heart': Heart,
  'Brain': Brain,
  'Code': Code,
  'Palette': Palette,
  'Music': Music,
  'Camera': Camera,
  'Microscope': Microscope,
  'Atom': Atom,
  'Dna': Dna,
  'Rocket': Rocket,
  'Cpu': Cpu,
  'Database': Database,
  'Network': Network,
  'Shield': Shield,
  'Lock': Lock,
  'Key': Key,
  'Settings': Settings,
  'Wrench': Wrench,
  'Hammer': Hammer,
  'Drill': Drill,
  'Saw': Saw,
  'Ruler': Ruler,
  'Calculator': Calculator,
  'BarChart3': BarChart3,
  'TrendingUp': TrendingUp,
  'PieChart': PieChart,
  'LineChart': LineChart,
  'Activity': Activity,
  'Pulse': Pulse,
  'Wind': Wind,
  'Droplet': Droplet,
  'Flame': Flame,
  'Leaf': Leaf,
  'Mountain': Mountain,
  'Sun': Sun,
  'Moon': Moon,
  'Star': Star,
  'Cloud': Cloud,
  'CloudRain': CloudRain,
  'CloudSnow': CloudSnow,
  'Waves': Waves,
  'Anchor': Anchor,
  'Map': Map,
  'Navigation': Navigation,
  'MapPin': MapPin,
  'Flag': Flag,
  'Bookmark': Bookmark,
  'Tag': Tag,
  'Label': Label,
  'Badge': Badge,
  'Layers': Layers,
  'Grid': Grid,
  'List': List,
  'Table': Table,
  'Columns': Columns,
  'Rows': Rows,
  'Square': Square,
  'Circle': Circle,
  'Triangle': Triangle,
  'Hexagon': Hexagon,
  'Pentagon': Pentagon,
  'Octagon': Octagon,
  'Diamond': Diamond,
  'Cross': Cross,
  'Plus': Plus,
  'Minus': Minus,
  'X': X,
  'Check': Check,
  'CheckCircle': CheckCircle,
  'AlertCircle': AlertCircle,
  'Info': Info,
  'HelpCircle': HelpCircle,
  'Question': Question,
  'Copy': Copy,
  'Clipboard': Clipboard,
  'Trash2': Trash2,
  'Edit2': Edit2,
  'Eye': Eye,
  'EyeOff': EyeOff,
  'Search': Search,
  'Filter': Filter,
  'Download': Download,
  'Upload': Upload,
  'Share2': Share2,
  'Link': Link,
  'Mail': Mail,
  'MessageSquare': MessageSquare,
  'Phone': Phone,
  'Video': Video,
  'Mic': Mic,
  'Volume2': Volume2,
  'Volume': Volume,
  'VolumeX': VolumeX,
  'Headphones': Headphones,
  'Radio': Radio,
  'Wifi': Wifi,
  'WifiOff': WifiOff,
  'Bluetooth': Bluetooth,
  'Smartphone': Smartphone,
  'Tablet': Tablet,
  'Monitor': Monitor,
  'Tv': Tv,
  'Watch': Watch,
  'HardDrive': HardDrive,
  'Disc': Disc,
  'Disc3': Disc3,
  'Floppy': Floppy,
  'Save': Save,
  'Folder': Folder,
  'FolderOpen': FolderOpen,
  'File': File,
  'FileCode': FileCode,
  'FileImage': FileImage,
  'FileVideo': FileVideo,
  'FileAudio': FileAudio,
  'FileArchive': FileArchive,
  'FileCheck': FileCheck,
  'FileX': FileX,
  'FileMinus': FileMinus,
  'FilePlus': FilePlus,
};

const DynamicIcon = ({ name, className, defaultIcon: DefaultIcon = FolderTree }) => {
  const IconComponent = name && ICON_MAP[name] ? ICON_MAP[name] : DefaultIcon;
  return <IconComponent className={className} />;
};

const UnifiedCategoriesPage = () => {
  const { 
    categories, 
    subCategories, 
    loading, 
    pdfCounts, 
    loadPdfCount,
    createCategory,
    updateCategory,
    deleteCategory,
    createSubCategory,
    updateSubCategory,
    deleteSubCategory
  } = useCategoriesManagement();

  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [catSearch, setCatSearch] = useState('');
  const [subCatSearch, setSubCatSearch] = useState('');

  // Modal States
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  
  const [subCatModalOpen, setSubCatModalOpen] = useState(false);
  const [editingSubCat, setEditingSubCat] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Derived Data
  const selectedCategory = useMemo(() => categories.find(c => c.id === selectedCategoryId) || null, [categories, selectedCategoryId]);

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.categoryName.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catSearch]);

  const activeSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subCategories
      .filter(s => s.categoryId === selectedCategoryId)
      .filter(s => s.subCategoryName.toLowerCase().includes(subCatSearch.toLowerCase()) || 
                   (s.programName && s.programName.toLowerCase().includes(subCatSearch.toLowerCase())));
  }, [subCategories, selectedCategoryId, subCatSearch]);

  // Set initial selection
  useEffect(() => {
    if (!loading && categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [loading, categories, selectedCategoryId]);

  // Fetch PDF counts when viewing subcategories
  useEffect(() => {
    activeSubCategories.forEach(sub => {
      loadPdfCount(sub.id);
    });
  }, [activeSubCategories, loadPdfCount]);

  // Handlers
  const handleSaveCategory = async (data) => {
    if (editingCat) {
      await updateCategory(editingCat.id, data);
    } else {
      const newCat = await createCategory(data);
      setSelectedCategoryId(newCat.id);
    }
  };

  const handleSaveSubCategory = async (data) => {
    const payload = { ...data, categoryId: selectedCategoryId };
    if (editingSubCat) {
      await updateSubCategory(editingSubCat.id, payload);
    } else {
      await createSubCategory(payload);
    }
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (deletingItem.type === 'Category') {
        await deleteCategory(deletingItem.id);
        if (selectedCategoryId === deletingItem.id) {
          setSelectedCategoryId(categories.find(c => c.id !== deletingItem.id)?.id || null);
        }
      } else {
        await deleteSubCategory(deletingItem.id);
      }
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (item, type) => {
    let childCount = 0;
    if (type === 'Category') {
      childCount = subCategories.filter(s => s.categoryId === item.id).length;
    } else {
      childCount = pdfCounts[item.id] || 0;
    }

    setDeletingItem({
      id: item.id,
      name: type === 'Category' ? item.categoryName : item.subCategoryName,
      type,
      childCount
    });
    setDeleteDialogOpen(true);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border/50 shrink-0 space-y-4">
        <Button 
          className="w-full justify-start shadow-sm" 
          onClick={() => { setEditingCat(null); setCatModalOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Find categories..." 
            value={catSearch} 
            onChange={e => setCatSearch(e.target.value)}
            className="pl-9 bg-background/50 h-9"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-md)]" />)
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FolderTree className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No categories found</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search or create a new one.</p>
          </div>
        ) : (
          filteredCategories.map(cat => {
            const isSelected = selectedCategoryId === cat.id;
            const subCatCount = subCategories.filter(s => s.categoryId === cat.id).length;
            
            return (
              <div 
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-[var(--radius-md)] cursor-pointer transition-all duration-200 group border",
                  isSelected 
                    ? "bg-primary/10 border-primary/20 shadow-sm" 
                    : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground group-hover:bg-background"
                )}>
                  <DynamicIcon name={cat.icon} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={cn("text-sm font-semibold truncate", isSelected ? "text-foreground" : "text-foreground/80")}>
                    {cat.categoryName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Layers className="w-3 h-3" /> {subCatCount} subs
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity", isSelected && "opacity-100")}>
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingCat(cat); setCatModalOpen(true); }}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Category
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDeleteDialog(cat, 'Category'); }} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <PageTransition className="flex flex-col h-[calc(100vh-6rem)] min-h-[600px] overflow-hidden pb-4">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-poppins font-bold text-foreground flex items-center gap-3">
            <span className="lg:hidden">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9"><Menu className="w-5 h-5" /></Button>
                </DrawerTrigger>
                <DrawerContent className="h-[80vh]">
                  <SidebarContent />
                </DrawerContent>
              </Drawer>
            </span>
            Content Structure
          </h1>
          <p className="text-muted-foreground mt-1 hidden sm:block">Manage categories and their educational topics.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Desktop Sidebar */}
        <Card className="w-80 hidden lg:flex flex-col shadow-soft-md border-border/50 bg-card overflow-hidden shrink-0">
          <SidebarContent />
        </Card>

        {/* Main Content Area */}
        <Card className="flex-1 flex flex-col shadow-soft-md border-border/50 bg-card overflow-hidden min-w-0">
          {loading && !selectedCategory ? (
            <div className="flex-1 flex items-center justify-center">
              <Skeleton className="w-64 h-64 rounded-full" />
            </div>
          ) : !selectedCategory ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-muted/5">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6 border border-border">
                <FolderTree className="w-10 h-10 text-muted-foreground/40" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">No Category Selected</h2>
              <p className="text-muted-foreground max-w-sm mb-6">Choose a category from the sidebar or create a new one to view and manage its sub-categories.</p>
              <Button onClick={() => { setEditingCat(null); setCatModalOpen(true); }} className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create First Category
              </Button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Category Header */}
              <div className="p-6 md:p-8 border-b border-border/50 bg-gradient-to-r from-muted/30 to-background shrink-0 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-1/4 -translate-y-1/4">
                  <DynamicIcon name={selectedCategory.icon} className="w-64 h-64" />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20 shrink-0">
                      <DynamicIcon name={selectedCategory.icon} className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl sm:text-3xl font-bold font-poppins text-foreground">{selectedCategory.categoryName}</h2>
                        {selectedCategory.isActive ? (
                          <BadgeComponent variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1"/> Active</BadgeComponent>
                        ) : (
                          <BadgeComponent variant="outline" className="bg-muted text-muted-foreground"><XCircle className="w-3 h-3 mr-1"/> Inactive</BadgeComponent>
                        )}
                      </div>
                      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
                        {selectedCategory.description || "No description provided for this category."}
                      </p>
                      <div className="flex items-center gap-4 mt-4 text-sm font-medium">
                        <span className="flex items-center bg-background px-2.5 py-1 rounded-[var(--radius-sm)] border border-border shadow-sm">
                          <Hash className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground mr-1">Type:</span> {selectedCategory.categoryType}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => { setEditingCat(selectedCategory); setCatModalOpen(true); }} className="bg-background shadow-sm">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sub-Categories Section */}
              <div className="flex flex-col flex-1 min-h-0 bg-background/50">
                <div className="p-4 md:px-8 py-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/5 shrink-0">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    Sub-Categories <BadgeComponent variant="secondary" className="ml-3">{activeSubCategories.length}</BadgeComponent>
                  </h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder="Search sub-categories..." 
                        value={subCatSearch}
                        onChange={e => setSubCatSearch(e.target.value)}
                        className="pl-9 h-9 bg-background shadow-sm"
                      />
                    </div>
                    <Button size="sm" onClick={() => { setEditingSubCat(null); setSubCatModalOpen(true); }} className="shadow-sm shrink-0">
                      <Plus className="w-4 h-4 mr-2 hidden sm:inline" /> Add Sub
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                  {activeSubCategories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-12 bg-card border border-border border-dashed rounded-[var(--radius-xl)]">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Layers className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">No sub-categories yet</h4>
                      <p className="text-muted-foreground text-sm max-w-sm mb-6">Create topics or programs within this category to organize your PDFs effectively.</p>
                      <Button onClick={() => { setEditingSubCat(null); setSubCatModalOpen(true); }} variant="outline" className="shadow-sm">
                        <Plus className="w-4 h-4 mr-2" /> Create Sub-Category
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      <AnimatePresence>
                        {activeSubCategories.map(sub => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            key={sub.id} 
                            className="group flex flex-col p-5 bg-card border border-border/50 rounded-[var(--radius-lg)] hover:border-primary/30 hover:shadow-soft-md transition-all duration-200 relative overflow-hidden"
                          >
                            {!sub.isActive && (
                              <div className="absolute top-0 right-0 border-t-[40px] border-r-[40px] border-t-muted border-r-transparent w-0 h-0">
                                <span className="absolute -top-[30px] left-[5px] text-[10px] font-bold text-muted-foreground uppercase transform rotate-45">Off</span>
                              </div>
                            )}
                            
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-accent/10 flex items-center justify-center text-accent shrink-0">
                                <DynamicIcon name={sub.icon} defaultIcon={FileText} className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0 pr-8">
                                <h4 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">{sub.subCategoryName}</h4>
                                <p className="text-sm font-medium text-muted-foreground truncate">{sub.programName}</p>
                              </div>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingSubCat(sub); setSubCatModalOpen(true); }}>
                                    <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => openDeleteDialog(sub, 'Sub-Category')} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Topic
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                              {sub.objective || sub.descriptive || "No description provided."}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                              <div className="flex items-center text-sm font-medium text-foreground bg-muted/50 px-3 py-1 rounded-[var(--radius-sm)] border border-border/50">
                                <FileText className="w-4 h-4 mr-2 text-primary" />
                                {pdfCounts[sub.id] !== undefined ? (
                                  <span className="tabular-nums">{pdfCounts[sub.id]} PDFs</span>
                                ) : (
                                  <Skeleton className="w-12 h-4" />
                                )}
                              </div>
                              <Button variant="ghost" size="sm" className="text-xs group-hover:text-primary transition-colors -mr-2" asChild>
                                <a href={`/admin/pdf-upload?category=${selectedCategoryId}&sub=${sub.id}`}>
                                  Manage Files <ChevronRight className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <CategoryModal 
        isOpen={catModalOpen} 
        onClose={() => setCatModalOpen(false)} 
        onSave={handleSaveCategory}
        category={editingCat}
      />

      <SubCategoryModal 
        isOpen={subCatModalOpen} 
        onClose={() => setSubCatModalOpen(false)} 
        onSave={handleSaveSubCategory}
        subCategory={editingSubCat}
        categoryName={selectedCategory?.categoryName}
      />

      {deletingItem && (
        <DeleteConfirmationDialog 
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={confirmDelete}
          itemName={deletingItem.name}
          itemType={deletingItem.type}
          childCount={deletingItem.childCount}
          loading={isDeleting}
        />
      )}
    </PageTransition>
  );
};

export default UnifiedCategoriesPage;
