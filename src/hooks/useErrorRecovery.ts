import { useState } from 'react';

export const useErrorRecovery = () => {
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  const executeWithRetry = async <T>(operation: () => Promise<T>, context: string): Promise<T> => {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        const result = await operation();
        setRetryCount(0); // Reset on success
        return result;
      } catch (error) {
        lastError = error;
        if (error instanceof Error) {
          console.warn(`${context} attempt ${attempt + 1} failed:`, error);
          if (error.message?.includes('Invalid address') || error.message?.includes('not found')) {
            throw error;
          }
        }
      }
    }
    setRetryCount(retryCount + 1);
    if (lastError instanceof Error) {
      throw new Error(`${context} failed after ${maxRetries + 1} attempts: ${lastError.message}`);
    }
    throw new Error(`${context} failed after ${maxRetries + 1} attempts: Unknown error`);
  };

  return executeWithRetry;
}; 