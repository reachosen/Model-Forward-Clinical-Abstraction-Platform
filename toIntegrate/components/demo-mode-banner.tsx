"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function DemoModeBanner() {
  return (
    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">Demo Mode</AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        You are viewing a demonstration case. Task executions in this mode use pre-configured settings and example data.
      </AlertDescription>
    </Alert>
  );
}
