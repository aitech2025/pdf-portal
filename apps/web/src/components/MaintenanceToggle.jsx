
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MaintenanceToggle = () => {
  const [record, setRecord] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await pb.collection('maintenanceMode').getList(1, 1, { $autoCancel: false });
        if (res.items.length > 0) {
          setRecord(res.items[0]);
          setIsEnabled(res.items[0].isEnabled);
        } else {
          const newRecord = await pb.collection('maintenanceMode').create({ isEnabled: false }, { $autoCancel: false });
          setRecord(newRecord);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchMaintenance();
  }, []);

  const handleToggle = async (checked) => {
    if (!record) return;
    try {
      await pb.collection('maintenanceMode').update(record.id, { isEnabled: checked }, { $autoCancel: false });
      setIsEnabled(checked);
      toast.success(`Maintenance mode ${checked ? 'enabled' : 'disabled'}`);
    } catch (err) {
      toast.error('Failed to update maintenance mode');
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-card p-4 rounded-lg border">
      <Switch id="maintenance-mode" checked={isEnabled} onCheckedChange={handleToggle} />
      <Label htmlFor="maintenance-mode" className="font-medium">
        Maintenance Mode {isEnabled ? '(Active)' : '(Inactive)'}
      </Label>
    </div>
  );
};

export default MaintenanceToggle;
