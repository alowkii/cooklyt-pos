import { WifiOff } from 'lucide-react';
import { useOnline } from '../hooks/useOnline';

export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
      <WifiOff size={15} />
      Offline — changes will sync automatically when connection is restored
    </div>
  );
}