import { useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface NewHACDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHAC: (displayName: string, description: string) => Promise<void>;
}

export function NewHACDialog({ open, onOpenChange, onCreateHAC }: NewHACDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!displayName.trim()) return;

    setIsCreating(true);
    try {
      await onCreateHAC(displayName, description);
      // Reset form
      setDisplayName('');
      setDescription('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create HAC:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New HAC</DialogTitle>
          <DialogDescription>
            Create a new Hospital-Acquired Condition configuration. You'll be able to configure all details in the next
            step.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name *</Label>
            <Input
              id="display-name"
              placeholder="e.g., Pressure Injury"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isCreating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this HAC..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isCreating}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!displayName.trim() || isCreating}>
            {isCreating ? 'Creating...' : 'Create HAC'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
