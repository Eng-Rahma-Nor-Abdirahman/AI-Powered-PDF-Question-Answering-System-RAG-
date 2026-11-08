<div align="center">

# AI-Powered PDF Question Answering System (RAG)

![Project Screenshot](screenshots/screenshots/Screenshot 2026-11-08 183337.png)

</div>


# AI-Powered PDF Question Answering System (RAG)

An AI-powered application that allows users to ask questions about PDF documents and receive answers based on their content using Retrieval-Augmented Generation (RAG).

## Overview

The **AI-Powered PDF Question Answering System** is designed to make it easier to understand and retrieve information from PDF documents. Instead of manually searching through long documents, users can ask questions through a chat interface and receive context-based answers.

The system combines document retrieval, vector search, and AI-generated responses to help users find relevant information from their PDFs.

## Features

- **PDF Question Answering:** Ask questions about uploaded PDF documents.
- **AI-Powered Chat:** Interact with document content through a chat interface.
- **Retrieval-Augmented Generation (RAG):** Retrieve relevant document content to provide context for AI responses.
- **Vector Search:** Search for semantically relevant content using Pinecone.
- **Result Reranking:** Use Cohere to rerank retrieved content where configured.
- **Streaming Responses:** Display AI responses progressively in the chat interface.
- **Document-Based Context:** Instruct the AI to base its answers on the retrieved document content.
- **Chat History:** Store and retrieve conversation messages using MongoDB, where configured.

## Technologies Used

- **Next.js** — Application framework
- **React** — User interface
- **TypeScript** — Type-safe development
- **MongoDB** — Document and conversation data storage
- **Pinecone** — Vector database and similarity search
- **Cohere** — Reranking retrieved content
- **Google Gemini** — AI response generation
- **Vercel AI SDK** — AI integration and streaming
- **Tailwind CSS** — UI styling

## How It Works

1. The user uploads a PDF document.
2. The document content is processed into smaller text chunks.
3. Relevant content is retrieved using vector similarity search.
4. Retrieved results can be reranked to improve relevance.
5. The relevant context is passed to the AI model.
6. The AI generates an answer based on the available document context.
7. The answer is displayed in the chat interface.

## Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git

You will also need the API credentials and database configuration required by your project.

### Installation

**1. Clone the repository**

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

**2. Navigate to the project directory**

```bash
cd YOUR_PROJECT_FOLDER
```

**3. Install dependencies**

```bash
npm install
```

**4. Configure environment variables**

Create a `.env.local` file in the project root and add the environment variables required by your implementation.

For example, depending on your code:

```env
MONGODB_URI=
GOOGLE_API_KEY=
PINECONE_API_KEY=
COHERE_API_KEY=
```

Add any other variables required by your project, such as your Pinecone index configuration or embedding provider settings.

Do not commit real API keys, passwords, or database connection strings to GitHub.

**5. Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

The main parts of the application include:

- `app/` — Application pages and API routes
- `components/` — Reusable UI components and chat interface
- `lib/` — Database, vector search, and AI-related logic
- `public/` — Static assets, if used
- `.env.local` — Local environment configuration; do not commit this file

The exact structure may vary depending on the current implementation.

## Screenshots

Add screenshots of your actual application here to demonstrate its interface and functionality.

Suggested screenshots:

- Home page
- PDF upload or document list
- Chat interface
- Example question and AI-generated answer

Once you add screenshots to the repository, reference them using Markdown image links.

## Future Improvements

- Improve document retrieval accuracy
- Add support for additional document formats
- Improve source references in AI answers
- Enhance the user experience and document management
- Add deployment and production monitoring

## Security

- Keep API keys and database credentials private.
- Configure production environment variables in your hosting provider.
- Validate user input and uploaded documents.
- Restrict database access appropriately.

## Author

**Rahma Nor**

GitHub: [Eng-Rahma-Nor-Abdirahman](https://github.com/Eng-Rahma-Nor-Abdirahman)

---

*Built to make searching and understanding PDF documents easier with AI and Retrieval-Augmented Generation (RAG).*
