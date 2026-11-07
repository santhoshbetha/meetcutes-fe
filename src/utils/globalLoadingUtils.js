// Global loading utilities
import { useGlobalLoading } from '../hooks/useGlobalLoading';

// Hook for using global loading in components
export const useGlobalLoadingUtils = () => {
  const { showLoading, hideLoading } = useGlobalLoading();

  // Utility function to wrap async operations with loading
  const withLoading = async (asyncFn, loadingMessage = 'Loading...') => {
    try {
      showLoading(loadingMessage);
      const result = await asyncFn();
      return result;
    } finally {
      hideLoading();
    }
  };

  // Utility function for promises
  const withLoadingPromise = (promise, loadingMessage = 'Loading...') => {
    showLoading(loadingMessage);
    return promise.finally(() => hideLoading());
  };

  return {
    showLoading,
    hideLoading,
    withLoading,
    withLoadingPromise,
  };
};

// Example usage:
/*
// In a component:
const { withLoading } = useGlobalLoadingUtils();

// Wrap an async function:
const handleSubmit = async () => {
  await withLoading(async () => {
    // Your async operation here
    await someApiCall();
  }, 'Saving data...');
};

// Or wrap a promise:
const handleFetch = () => {
  withLoadingPromise(fetchData(), 'Fetching data...');
};
*/