import { useState, useEffect, useCallback } from 'react';
import pb from '@/lib/apiClient.js';
import { formatSettingsForDisplay, formatSettingsForSave, DEFAULT_SETTINGS } from '@/utils/systemSettingsUtils.js';
import { toast } from 'sonner';

async function apiFetch(path, method = 'GET', body = null) {
  const token = pb.authStore.token;
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export function useSystemSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/api/systemSettings');
      if (data && data.id) {
        setRecordId(data.id);
        setSettings(formatSettingsForDisplay(data));
      } else {
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (error) {
      console.error('Failed to fetch system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSettings = async (newSettings) => {
    if (!recordId) {
      toast.error('No settings record found');
      return false;
    }
    setSaving(true);
    try {
      const dataToSave = formatSettingsForSave(newSettings);
      await apiFetch(`/api/systemSettings/${recordId}`, 'PATCH', dataToSave);
      setSettings(formatSettingsForDisplay(dataToSave));
      toast.success('Settings saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings: ' + error.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateSection = async (section, data) => {
    const updatedSettings = { ...settings };
    if (['featureFlags', 'integrations', 'securitySettings', 'backupSettings'].includes(section)) {
      updatedSettings[section] = { ...updatedSettings[section], ...data };
    } else {
      Object.assign(updatedSettings, data);
    }
    return await saveSettings(updatedSettings);
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    updateSection,
    refresh: fetchSettings,
  };
}
