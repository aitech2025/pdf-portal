
import React, { useState, useEffect } from 'react';
import pb from '@/lib/apiClient.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const CommentsSection = ({ isOpen, onClose, pdf }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    if (!pdf?.id) return;
    setLoading(true);
    try {
      const res = await pb.collection('comments').getFullList({
        filter: `pdfId="${pdf.id}"`,
        sort: 'created',
        expand: 'userId',
        $autoCancel: false
      });
      setComments(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, pdf]);

  const handlePost = async () => {
    if (!newComment.trim() || !pb.authStore.model?.id) return;
    setSubmitting(true);
    try {
      await pb.collection('comments').create({
        pdfId: pdf.id,
        userId: pb.authStore.model.id,
        commentText: newComment
      }, { $autoCancel: false });
      setNewComment('');
      fetchComments();
    } catch (e) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await pb.collection('comments').delete(id, { $autoCancel: false });
      setComments(comments.filter(c => c.id !== id));
      toast.success('Comment removed');
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 shrink-0 bg-muted/10">
          <DialogTitle className="text-xl font-poppins flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" /> Moderator Notes & Comments
          </DialogTitle>
          <DialogDescription className="truncate">
            Discussion for: {pdf?.fileName}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center">Loading comments...</p>
            ) : comments.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p>No comments on this document yet.</p>
              </div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-muted/30 p-4 rounded-[var(--radius-md)] border border-border/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-sm mr-2">{c.expand?.userId?.name || c.expand?.userId?.email || 'Unknown User'}</span>
                      <span className="text-xs text-muted-foreground">{new Date(c.created).toLocaleString()}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{c.commentText}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border/50 bg-card shrink-0">
          <Textarea 
            value={newComment} 
            onChange={(e) => setNewComment(e.target.value)} 
            placeholder="Add a moderation note or comment..." 
            className="mb-3 bg-background resize-none min-h-[80px]"
            disabled={submitting}
          />
          <div className="flex justify-end">
            <Button onClick={handlePost} disabled={!newComment.trim() || submitting} className="shadow-soft-sm">
              {submitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CommentsSection;
