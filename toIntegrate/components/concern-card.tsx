import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Beaker } from 'lucide-react';
import type { ConcernInfo } from "@/types/case";

interface ConcernCardProps {
  concern: ConcernInfo;
}

export function ConcernCard({ concern }: ConcernCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <CardTitle className="text-2xl">{concern.concern_name}</CardTitle>
        <CardDescription>{concern.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Link href={`/concern/${concern.concern_id}/cases`} className="w-full">
            <Button variant="default" className="w-full">
              View Cases
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          {concern.demo_case_id && (
            <Link href={`/case/${concern.demo_case_id}`} className="w-full">
              <Button variant="outline" className="w-full">
                <Beaker className="mr-2 h-4 w-4" />
                Demo Case
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
