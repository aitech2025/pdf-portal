
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const RejectionReasonModal = ({ isOpen, onClose, onReject, title = "Reject Request", description = "Please provide a reason for rejecting this request. This will be sent to the user." }) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onReject(reason);
    onClose(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-foreground">Rejection Reason *</Label>
            <Textarea
              id="reason"
              placeholder="e.g., Information incomplete, does not meet criteria..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={4}
              className="resize-none bg-background text-foreground"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={!reason.trim()}>Confirm Rejection</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RejectionReasonModal;
