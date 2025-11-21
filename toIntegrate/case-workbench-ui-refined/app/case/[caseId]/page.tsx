import { CaseViewPage } from '@/components/CaseViewPage'

interface PageProps {
  params: Promise<{ caseId: string }>
}

export default async function CasePage({ params }: PageProps) {
  const { caseId } = await params
  
  return <CaseViewPage caseId={caseId} />
}
