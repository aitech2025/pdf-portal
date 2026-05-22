import React, { useEffect, useState } from 'react';
import client from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const emptyForm = {
  programCode: '',
  programName: '',
  slug: '',
  description: '',
  displayOrder: 0,
  status: 'active',
};

const ProgramsManagementPage = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadPrograms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await client.fetch('/programs');
      setItems(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const createProgram = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await client.fetch('/programs', 'POST', {
        ...form,
        displayOrder: Number(form.displayOrder || 0),
      });
      setForm(emptyForm);
      await loadPrograms();
    } catch (err) {
      setError(err.message || 'Failed to create program');
    } finally {
      setSaving(false);
    }
  };

  const updateProgram = async (programId, updates) => {
    try {
      await client.fetch(`/programs/${programId}`, 'PATCH', updates);
      await loadPrograms();
    } catch (err) {
      setError(err.message || 'Failed to update program');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Programs Management</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={createProgram}>
            <div className="space-y-1">
              <Label>Program Code</Label>
              <Input value={form.programCode} onChange={(e) => setForm((s) => ({ ...s, programCode: e.target.value.toUpperCase() }))} required />
            </div>
            <div className="space-y-1">
              <Label>Program Name</Label>
              <Input value={form.programName} onChange={(e) => setForm((s) => ({ ...s, programName: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))} placeholder="auto if empty" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Display Order</Label>
              <Input type="number" value={form.displayOrder} onChange={(e) => setForm((s) => ({ ...s, displayOrder: e.target.value }))} />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" isLoading={saving}>Create Program</Button>
            </div>
          </form>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Programs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading programs...</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-lg border p-3 flex flex-wrap gap-2 items-center">
                  <Input className="w-24" defaultValue={item.programCode} onBlur={(e) => updateProgram(item.id, { programCode: e.target.value })} />
                  <Input className="min-w-[220px] flex-1" defaultValue={item.programName} onBlur={(e) => updateProgram(item.id, { programName: e.target.value })} />
                  <Input className="min-w-[140px]" defaultValue={item.status} onBlur={(e) => updateProgram(item.id, { status: e.target.value })} />
                  <Input className="w-24" type="number" defaultValue={item.displayOrder} onBlur={(e) => updateProgram(item.id, { displayOrder: Number(e.target.value || 0) })} />
                </div>
              ))}
              {!items.length && <p className="text-sm text-muted-foreground">No programs found.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgramsManagementPage;
