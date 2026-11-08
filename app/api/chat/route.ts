
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
  streamText,
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
  validateUIMessages,
} from 'ai';

import { getDocument, connectDB } from '@/lib/mongodb';
import { searchSimilarVectors } from '@/lib/pinecone';
import { rerankWithCohere } from '@/lib/ai/rerank';

// Use the existing Google API key from .env.local
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, message: singleMessage, selectedDocumentId } = body;

    if (!selectedDocumentId) {
      return new Response('Document ID is required', { status: 400 });
    }

    let allMessages: UIMessage[];
    let messageText: string;

    // Get the latest message
    if (singleMessage) {
      allMessages = [singleMessage];

      messageText =
        singleMessage.parts?.find(
          (part: any) => part.type === 'text'
        )?.text ||
        singleMessage.content ||
        '';
    } else if (messages && messages.length > 0) {
      allMessages = messages;

      const latestMessage = messages[messages.length - 1];

      messageText =
        latestMessage.parts?.find(
          (part: any) => part.type === 'text'
        )?.text ||
        latestMessage.content ||
        '';
    } else {
      return new Response('No messages provided', { status: 400 });
    }

    // Validate messages
    let validatedMessages: UIMessage[];

    try {
      validatedMessages = await validateUIMessages({
        messages: allMessages,
      });
    } catch (error) {
      console.error('Message validation failed:', error);
      validatedMessages = allMessages;
    }

    // Retrieve relevant content from the selected PDF
    let context = '';

    if (messageText) {
      try {
        const document = await getDocument(selectedDocumentId);

        if (document) {
          // Pinecone uses integrated embedding search
          const searchResults = await searchSimilarVectors(
            messageText,
            20,
            { documentId: { $eq: selectedDocumentId } }
          );

          console.log('\n=== PINECONE SEARCH RESULTS ===');
          console.log('Query:', messageText);
          console.log('Total results:', searchResults.length);

          searchResults.slice(0, 5).forEach((result, index) => {
            console.log(
              `${index + 1}. Similarity: ${result.similarity.toFixed(4)} | Content: ${result.content?.substring(0, 100)}...`
            );
          });

          // Rerank search results with Cohere
          const rerankedResults = await rerankWithCohere(
            messageText,
            searchResults
          );

          console.log('\n=== COHERE RERANKED RESULTS ===');
          console.log('Total reranked results:', rerankedResults.length);

          rerankedResults.slice(0, 5).forEach((result, index) => {
            console.log(
              `${index + 1}. Relevance: ${result.similarity.toFixed(4)} | Content: ${result.content?.substring(0, 100)}...`
            );
          });

          console.log('=== END COMPARISON ===\n');

          // Build the context for Gemini
          const contextChunks = rerankedResults
            .slice(0, 10)
            .map(
              (result, index) =>
                `[Source ${index + 1}]: ${result.content || 'No content available'}`
            )
            .join('\n\n');

          context = `You have access to content from: ${document.title}\n\nContext:\n${contextChunks}`;
        }
      } catch (error) {
        console.error('RAG processing error:', error);
      }
    }

 // Generate a streamed response using Google Gemini
const result = streamText({
  model: google("gemini-3.8-flash"),

  system: `You are a helpful AI assistant that answers questions based on document context.

${context || 'No document context available.'}

IMPORTANT INSTRUCTIONS:
- Extract specific facts, numbers, and details from the context above.
- If the context contains the answer, provide the exact information.
- Quote specific amounts, percentages, and figures when available.
- If the context does not contain the requested information, clearly state this.
- Always base your answers on the provided context, not general knowledge.
- If no relevant document context is available, tell the user that you could not find the answer in the document.`,

  messages: await convertToModelMessages(validatedMessages),
});

// Handle client disconnects while streaming
result.consumeStream();

    console.log(
      'About to return stream response with validatedMessages:',
      validatedMessages.length
    );
    console.log('Context:', context);

    return result.toUIMessageStreamResponse({
      originalMessages: validatedMessages,

      // Generate consistent server-side message IDs
      generateMessageId: createIdGenerator({
        prefix: 'msg',
        size: 16,
      }),

      // Save messages to MongoDB
      onFinish: async ({ messages: finishedMessages }) => {
        console.log(
          'onFinish called with messages:',
          finishedMessages.length
        );

        try {
          await connectDB();

          const conversationId = selectedDocumentId;
          const { Message } = await import('@/lib/mongodb');

          for (const message of finishedMessages) {
            const textContent =
              message.parts
                ?.filter((part: any) => part.type === 'text')
                ?.map((part: any) => part.text)
                ?.join('') || '';

            // Do not save empty text messages
            if (!textContent.trim()) {
              continue;
            }

            await Message.create({
              id: message.id,
              conversationId,
              role: message.role,
              content: textContent,
              createdAt: new Date(),
              documentId: selectedDocumentId,
              context:
                message.role === 'assistant'
                  ? context.substring(0, 1000)
                  : undefined,
            });
          }

          console.log('Messages saved successfully in onFinish');
        } catch (error) {
          console.error(
            'Error saving messages in onFinish:',
            error
          );
        }
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    return new Response('Internal Server Error', {
      status: 500,
    });
  }
}
