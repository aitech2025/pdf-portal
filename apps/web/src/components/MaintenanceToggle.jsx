
import React, { useState, useEffect } from 'react';
import client from '@/lib/apiClient';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MaintenanceToggle = () => {
  const [record, setRecord] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const res = await client.fetch('/maintenanceMode', 'GET', null, { page: 1, per_page: 1 });
        const items = res.items || res;
        if (items.length > 0) {
          setRecord(items[0]);
          setIsEnabled(items[0].isEnabled);
        } else {
          const newRecord = await client.fetch('/maintenanceMode', 'POST', { isEnabled: false });
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
      await client.fetch(`/maintenanceMode/${record.id}`, 'PATCH', { isEnabled: checked });
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
