import { useState, useEffect } from 'react';
import { getHACConfig, saveHACConfig, previewHAC, publishHAC } from '../api/hac-config';
import type { HACConfig, PreviewResponse } from '../types/hac-config';
import { useToast } from './use-toast';

export function useHACConfig(concernId: string) {
  const [config, setConfig] = useState<HACConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!concernId) return;

    setLoading(true);
    setError(null);

    getHACConfig(concernId)
      .then(setConfig)
      .catch((err) => {
        setError(err.message);
        toast({
          title: 'Error',
          description: `Failed to load HAC config: ${err.message}`,
          variant: 'destructive',
        });
      })
      .finally(() => setLoading(false));
  }, [concernId, toast]);

  const saveConfig = async (updatedConfig: HACConfig) => {
    try {
      const saved = await saveHACConfig(concernId, updatedConfig);
      setConfig(saved);
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      });
      return saved;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Failed to save: ${err.message}`,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const runPreview = async (sampleCaseId: string): Promise<PreviewResponse> => {
    try {
      const result = await previewHAC(concernId, sampleCaseId);
      toast({
        title: 'Preview Ready',
        description: 'HAC preview generated successfully',
      });
      return result;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Preview failed: ${err.message}`,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const publish = async (targetStatus: 'active' | 'archived') => {
    try {
      const published = await publishHAC(concernId, targetStatus);
      setConfig(published);
      toast({
        title: 'Success',
        description: `HAC ${targetStatus === 'active' ? 'published' : 'archived'} successfully`,
      });
      return published;
    } catch (err: any) {
      toast({
        title: 'Error',
        description: `Failed to publish: ${err.message}`,
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    config,
    setConfig,
    loading,
    error,
    saveConfig,
    runPreview,
    publish,
  };
}
