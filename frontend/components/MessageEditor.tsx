import {
  createMessage,
  deleteTrailingMessages,
} from '@/frontend/dexie/queries';
import { UseChatHelpers } from '@ai-sdk/react';
import { useState } from 'react';
import { UIMessage } from 'ai';
import { Dispatch, SetStateAction } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { useMessageSummary } from '../hooks/useMessageSummary';

export default function MessageEditor({
  threadId,
  message,
  content,
  setMessages,
  regenerate,
  setMode,
  stop,
}: {
  threadId: string;
  message: UIMessage;
  content: string;
  setMessages: UseChatHelpers<UIMessage>['setMessages'];
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  regenerate: UseChatHelpers<UIMessage>['regenerate'];
  stop: UseChatHelpers<UIMessage>['stop'];
}) {
  const [draftContent, setDraftContent] = useState(content);

  const { complete } = useMessageSummary();

  const handleSave = async () => {
    try {
      await deleteTrailingMessages(threadId, message.id);

      const updatedMessage: UIMessage = {
        ...message,
        id: uuidv4(),
        parts: [
          {
            type: 'text',
            text: draftContent,
          },
        ],
      };

      await createMessage(threadId, updatedMessage);

      setMessages((messages) => {
        const index = messages.findIndex((m) => m.id === message.id);

        if (index !== -1) {
          return [...messages.slice(0, index), updatedMessage];
        }

        return messages;
      });

      complete(draftContent, {
        body: {
          messageId: updatedMessage.id,
          threadId,
        },
      });
      setMode('view');

      // stop the current stream if any
      stop();

      setTimeout(() => {
        regenerate();
      }, 0);
    } catch (error) {
      console.error('Failed to save message:', error);
      toast.error('Failed to save message');
    }
  };

  return (
    <div>
      <Textarea
        value={draftContent}
        onChange={(e) => setDraftContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
          }
        }}
      />
      <div className="flex gap-2 mt-2">
        <Button onClick={handleSave}>Save</Button>
        <Button onClick={() => setMode('view')}>Cancel</Button>
      </div>
    </div>
  );
}
