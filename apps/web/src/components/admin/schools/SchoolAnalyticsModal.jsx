
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SchoolAnalyticsModal = ({ isOpen, onClose, school }) => {
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState([]);
  const [catData, setCatData] = useState([]);

  useEffect(() => {
    if (isOpen && school?.id) {
      setLoading(true);
      // Mocking complex aggregation data for the specific school
      setTimeout(() => {
        setTrendData([
          { date: 'W1', downloads: 45, users: 12 },
          { date: 'W2', downloads: 60, users: 18 },
          { date: 'W3', downloads: 50, users: 15 },
          { date: 'W4', downloads: 80, users: 24 },
        ]);
        setCatData([
          { name: 'Science', value: 120 },
          { name: 'Math', value: 90 },
          { name: 'History', value: 60 }
        ]);
        setLoading(false);
      }, 600);
    }
  }, [isOpen, school]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-card">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl font-poppins font-semibold">School Analytics</DialogTitle>
              <DialogDescription className="mt-1">
                Engagement metrics for {school?.schoolName}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" className="shadow-soft-sm bg-background">
              <Download className="w-4 h-4 mr-2" /> Export Report
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto bg-muted/10 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="bg-card border border-border/50 rounded-[var(--radius-lg)] p-5 shadow-soft-sm flex flex-col">
              <h3 className="font-semibold text-sm mb-4">Engagement Trends</h3>
              <div className="flex-1 min-h-[250px]">
                {loading ? <Skeleton className="w-full h-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="colorDls" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="downloads" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#colorDls)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-card border border-border/50 rounded-[var(--radius-lg)] p-5 shadow-soft-sm flex flex-col">
              <h3 className="font-semibold text-sm mb-4">Content Preferences</h3>
              <div className="flex-1 min-h-[250px]">
                {loading ? <Skeleton className="w-full h-full" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={catData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 500}} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}} />
                      <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SchoolAnalyticsModal;
