import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HACSidebar } from '../../../components/HACSidebar';
import { NewHACDialog } from '../../../components/NewHACDialog';
import { listHACs, createHAC } from '../../../api/hac-config';
import type { HACDefinition } from '../../../types/hac-config';

export default function HACConfigIndexPage() {
  const navigate = useNavigate();
  const [hacs, setHACs] = useState<HACDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewHACDialog, setShowNewHACDialog] = useState(false);

  useEffect(() => {
    listHACs()
      .then(setHACs)
      .finally(() => setLoading(false));
  }, []);

  const handleSelectHAC = (concernId: string) => {
    navigate(`/admin/hac-config/${concernId}`);
  };

  const handleCreateHAC = async (displayName: string, description: string) => {
    const newConfig = await createHAC(displayName, description);
    // Refresh HAC list
    const updatedHACs = await listHACs();
    setHACs(updatedHACs);
    // Navigate to the new HAC
    navigate(`/admin/hac-config/${newConfig.definition.concern_id}`);
  };

  const handleNewHAC = () => {
    setShowNewHACDialog(true);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading HACs...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <HACSidebar hacs={hacs} onSelectHAC={handleSelectHAC} onNewHAC={handleNewHAC} />
      <div className="flex flex-1 items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground">Select a HAC to Configure</h2>
          <p className="mt-2 text-muted-foreground">Choose a HAC from the sidebar or create a new one</p>
        </div>
      </div>
      <NewHACDialog open={showNewHACDialog} onOpenChange={setShowNewHACDialog} onCreateHAC={handleCreateHAC} />
    </div>
  );
}
