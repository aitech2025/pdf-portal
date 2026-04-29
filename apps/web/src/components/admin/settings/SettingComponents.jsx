
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SettingSection = ({ title, description, children, className }) => (
  <div className={cn("py-6 border-b border-border/50 last:border-0", className)}>
    <div className="mb-4">
      <h3 className="text-lg font-poppins font-semibold text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
    <div className="space-y-4">
      {children}
    </div>
  </div>
);

export const ToggleSetting = ({ label, description, checked, onCheckedChange, disabled }) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-muted/20 transition-colors">
    <div className="space-y-0.5 pr-4">
      <Label className="text-base font-medium cursor-pointer">{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

export const InputSetting = ({ label, description, type = "text", value, onChange, placeholder, disabled, className }) => (
  <div className={cn("space-y-2", className)}>
    <Label className="text-sm font-medium">{label}</Label>
    <Input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className="bg-background max-w-md" />
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
);

export const PasswordField = ({ label, value, onChange, placeholder, disabled, className }) => {
  const [show, setShow] = useState(false);
  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative max-w-md">
        <Input 
          type={show ? "text" : "password"} 
          value={value} 
          onChange={onChange} 
          placeholder={placeholder} 
          disabled={disabled} 
          className="bg-background pr-10" 
        />
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
          onClick={() => setShow(!show)}
          disabled={disabled}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export const SelectSetting = ({ label, description, value, onValueChange, options, disabled, className }) => (
  <div className={cn("space-y-2", className)}>
    <Label className="text-sm font-medium">{label}</Label>
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="bg-background max-w-md">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
);
