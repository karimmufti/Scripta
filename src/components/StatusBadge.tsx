import { cn } from '@/lib/utils';

type Status = 'pending' | 'recording' | 'recorded' | 'uploaded' | 'generated';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-pending/20 text-pending-foreground border-pending/30',
  },
  recording: {
    label: 'Recording',
    className: 'bg-recording/20 text-recording border-recording/30 animate-pulse-soft',
  },
  recorded: {
    label: 'Recorded',
    className: 'bg-primary/20 text-primary border-primary/30',
  },
  uploaded: {
    label: 'Uploaded',
    className: 'bg-success/20 text-success border-success/30',
  },
  generated: {
    label: 'Generated',
    className: 'bg-success/20 text-success border-success/30',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border',
        config.className,
        className
      )}
    >
      <span className={cn('status-dot', {
        'status-pending': status === 'pending',
        'status-recording': status === 'recording',
        'status-recorded': status === 'recorded' || status === 'uploaded' || status === 'generated',
      })} />
      {config.label}
    </span>
  );
}
