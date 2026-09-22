import { IssueBoard } from '@/components/work/issue-board';
import { PLACEHOLDER_ISSUES } from '@/components/work/placeholder-issues';

export default function HomePage() {
  return <IssueBoard issues={PLACEHOLDER_ISSUES} />;
}
