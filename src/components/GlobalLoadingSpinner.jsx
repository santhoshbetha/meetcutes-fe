import { useGlobalLoading } from '../hooks/useGlobalLoading';
import { Spinner } from './ui/spinner';

const GlobalLoadingSpinner = () => {
  const { isLoading, loadingMessage } = useGlobalLoading();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-background/90 rounded-2xl shadow-2xl border border-border/50">
        <Spinner size={50} withText={false} />
        <p className="text-lg font-medium text-foreground animate-pulse">
          {loadingMessage}
        </p>
      </div>
    </div>
  );
};

export default GlobalLoadingSpinner;