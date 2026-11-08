
import { connectDB, getDocument, getMessages } from '@/lib/mongodb';
import ChatInterface from '@/components/chat-interface-new';
import type { UIMessage } from 'ai';

interface PageProps {
  params: Promise<{ documentId: string }>;
}

async function loadChatHistory(
  documentId: string
): Promise<UIMessage[]> {
  try {
    const messages = await getMessages(documentId);

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      parts: [
        {
          type: 'text' as const,
          text: msg.content,
        },
      ],
    }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

export default async function ChatPage({ params }: PageProps) {
  const { documentId } = await params;

  console.log('Chat page documentId:', documentId);

  await connectDB();

  const document = await getDocument(documentId);

  if (!document) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">
          Document not found
        </h1>
        <p className="mt-2 text-muted-foreground">
          The requested PDF could not be found. Please return to
          the document library and try again.
        </p>
        <p className="mt-2 text-sm">
          Document ID: {documentId}
        </p>
      </div>
    );
  }

  const initialMessages = await loadChatHistory(documentId);

  return (
    <ChatInterface
      selectedDocumentId={documentId}
      initialMessages={initialMessages}
      documentTitle={document.title}
    />
  );
}
