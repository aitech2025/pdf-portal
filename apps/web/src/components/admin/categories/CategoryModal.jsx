
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, FolderTree, BookOpen, Users, Beaker, Compass, Lightbulb, Target, Award, Zap, Sparkles, Globe, Heart, Brain, Code, Palette, Music, Camera, Microscope, Atom, Dna, Rocket, Cpu, Database, Network, Shield, Lock, Key, Settings, Wrench, Hammer, Hammer as Drill, Sword as Saw, Ruler, Calculator, BarChart3, TrendingUp, PieChart, LineChart, Activity, HeartPulse as Pulse, Wind, Droplet, Flame, Leaf, Mountain, Sun, Moon, Star, Cloud, CloudRain, CloudSnow, Wind as WindIcon, Waves, Anchor, Compass as CompassIcon, Map, Navigation, MapPin, Flag, Bookmark, Tag, Tag as Label, Badge, Layers, Grid, List, Table, Columns, Rows, Square, Circle, Triangle, Hexagon, Pentagon, Octagon, Diamond, Cross, Plus, Minus, X, Check, CheckCircle, AlertCircle, Info, HelpCircle, Bug as Question, Copy, Clipboard, Trash2, Edit2, Eye, EyeOff, Search, Filter, Download, Upload, Share2, Link, Mail, MessageSquare, Phone, Video, Mic, Volume2, Volume, VolumeX, Headphones, Radio, Wifi, WifiOff, Bluetooth, Smartphone, Tablet, Monitor, Tv, Watch, Cpu as CpuIcon, HardDrive, Disc, Disc3, FlipHorizontal as Floppy, Save, Folder, FolderOpen, File, FileText, FileCode, FileImage, FileVideo, FileAudio, FileArchive, FileCheck, FileX, FileMinus, FilePlus, FileQuestion, FileSearch, FileJson, FileText as FileXml, FileJson as FileYaml, FileText as FileToml, FileOutput as FileConfig, FileSearch as FileSettings, FileOutput as FileUser, FileSearch as FileUsers, FileKey, FileKey as FileSecret, FileLock, FileLock as FileUnlock, FileHeart as FileShield, FileWarning as FileAlert, FileWarning, Files as FileInfo, FileQuestion as FileHelp, FileQuestion as FileQuestionIcon, FileSearch as FileSearchIcon, FileJson as FileJsonIcon, FileText as FileXmlIcon, FileJson as FileYamlIcon, FileText as FileTomlIcon, FileOutput as FileConfigIcon, FileSearch as FileSettingsIcon, FileOutput as FileUserIcon, FileSearch as FileUsersIcon, FileKey as FileKeyIcon, FileKey as FileSecretIcon, FileLock as FileLockIcon, FileLock as FileUnlockIcon, FileHeart as FileShieldIcon, FileWarning as FileAlertIcon, FileWarning as FileWarningIcon, Files as FileInfoIcon, FileQuestion as FileHelpIcon } from 'lucide-react';

// Static icon mapping object
const ICON_MAP = {
  'FolderTree': FolderTree,
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
  'FileText': FileText,
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

const categorySchema = z.object({
  categoryName: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  categoryType: z.enum(["Grade 1-5", "Grade 6-10"], { required_error: "Please select a category type" }),
  description: z.string().max(500, "Description is too long").optional().or(z.literal('')),
  icon: z.string().optional().or(z.literal('')),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).optional().default(0)
});

const DynamicIconPreview = ({ iconName }) => {
  const IconComponent = iconName && ICON_MAP[iconName] ? ICON_MAP[iconName] : FolderTree;
  return (
    <div className="w-10 h-10 rounded-[var(--radius-md)] bg-muted flex items-center justify-center border border-border/50 shrink-0">
      <IconComponent className="w-5 h-5 text-muted-foreground" />
    </div>
  );
};

const CategoryModal = ({ isOpen, onClose, onSave, category = null }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = !!category;

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      categoryName: '',
      categoryType: '',
      description: '',
      icon: '',
      isActive: true,
      displayOrder: 0
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (category) {
        form.reset({
          categoryName: category.categoryName || '',
          categoryType: category.categoryType || '',
          description: category.description || '',
          icon: category.icon || '',
          isActive: category.isActive !== false,
          displayOrder: category.displayOrder || 0
        });
      } else {
        form.reset({
          categoryName: '',
          categoryType: '',
          description: '',
          icon: '',
          isActive: true,
          displayOrder: 0
        });
      }
    }
  }, [isOpen, category, form]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await onSave(data);
      onClose();
    } catch (error) {
      // Error handled in the hook via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-poppins">{isEditing ? 'Edit Category' : 'Add New Category'}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="categoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Science, Mathematics..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="categoryType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Type <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an educational level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Grade 1-5">Grade 1-5</SelectItem>
                      <SelectItem value="Grade 6-10">Grade 6-10</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Brief description of this category..." 
                      className="resize-none h-20" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon Name</FormLabel>
                    <div className="flex gap-3">
                      <FormControl>
                        <Input placeholder="e.g. Book, Beaker..." {...field} />
                      </FormControl>
                      <DynamicIconPreview iconName={field.value} />
                    </div>
                    <FormDescription className="text-[11px]">Lucide-react icon name (PascalCase)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Order</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription className="text-[11px]">Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-[var(--radius-md)] border border-border/50 p-4 bg-muted/20">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>
                      Inactive categories are hidden from standard users.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Category'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;
