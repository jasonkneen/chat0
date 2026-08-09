import { useCallback, useState } from 'react';
import { useAPIKeyStore } from '@/frontend/stores/APIKeyStore';
import { toast } from 'sonner';
import { createMessageSummary, updateThread } from '@/frontend/dexie/queries';

interface MessageSummaryPayload {
  title: string;
  isTitle?: boolean;
  messageId: string;
  threadId: string;
}

interface CompleteOptions {
  body: {
    threadId: string;
    messageId: string;
    isTitle?: boolean;
  };
}

/**
 * `/api/completion` responds with a JSON payload rather than a token stream, so
 * this talks to it directly instead of going through `useCompletion` (whose
 * `onResponse` escape hatch was removed in AI SDK 5).
 */
export const useMessageSummary = () => {
  const getKey = useAPIKeyStore((state) => state.getKey);
  const [isLoading, setIsLoading] = useState(false);

  const complete = useCallback(
    async (prompt: string, { body }: CompleteOptions) => {
      const googleKey = getKey('google');
      setIsLoading(true);

      try {
        const response = await fetch('/api/completion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(googleKey && { 'X-Google-API-Key': googleKey }),
          },
          body: JSON.stringify({ prompt, ...body }),
        });

        const payload: MessageSummaryPayload & { error?: string } =
          await response.json();

        if (!response.ok) {
          toast.error(
            payload.error || 'Failed to generate a summary for the message'
          );
          return;
        }

        const { title, isTitle, messageId, threadId } = payload;

        if (isTitle) {
          await updateThread(threadId, title);
        }

        await createMessageSummary(threadId, messageId, title);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    [getKey]
  );

  return {
    complete,
    isLoading,
  };
};
