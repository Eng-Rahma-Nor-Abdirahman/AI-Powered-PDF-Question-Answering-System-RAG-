// Document processing using LangChain loaders (much more reliable)

/**
 * Process different document types and extract text content
 * This is the main function that decides how to handle each file type
 */
export async function processDocument(
  file: File
): Promise<{ content: string; chunks: string[] }> {
  // Get the file extension (pdf, docx, txt, etc.)
  // Example: "document.pdf" becomes "pdf"
  const fileType = file.name.split('.').pop()?.toLowerCase();
  
  let content = '';
  
  // Choose the right processing method based on file type
  switch (fileType) {
    case 'pdf':
      console.log('Processing PDF file:', file.name);
      content = await processPDF(file);
      break;
    case 'docx':
      console.log('Processing DOCX file:', file.name);
      content = await processDOCX(file);
      break;
    case 'txt':
    case 'md':
      console.log('Processing text file:', file.name);
      content = await processText(file);
      break;
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
  
  // Break the content into smaller pieces (chunks) for better AI processing
  const chunks = await createChunks(content, file.name);
  
  return { content, chunks };
}

/**
 * Process PDF files using LangChain PDF loader (much more reliable)
 */
async function processPDF(file: File): Promise<string> {
  try {
    console.log('Processing PDF with LangChain:', file.name, 'Size:', file.size);
    
    // Dynamic import of LangChain PDF loader (community package)
    const { PDFLoader } = await import('@langchain/community/document_loaders/fs/pdf');
    
    // Convert File to Blob for LangChain
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
    
    // Create PDF loader with blob
    const loader = new PDFLoader(blob);
    
    // Load and parse the PDF
    const docs = await loader.load();
    console.log('PDF loaded. Number of pages:', docs.length);
    
    // Combine all pages into single text
    let fullText = '';
    docs.forEach((doc, index) => {
      if (doc.pageContent.trim()) {
        fullText += `\n\nPage ${index + 1}:\n${doc.pageContent.trim()}`;
      }
    });
    
    if (!fullText.trim()) {
      return `No text content could be extracted from ${file.name}. The PDF might be image-based or encrypted.`;
    }
    
    console.log('PDF processing complete. Text length:', fullText.length);
    return fullText.trim();
    
  } catch (error) {
    console.error('PDF processing error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF') || error.message.includes('PDF')) {
        throw new Error(`The uploaded file is not a valid PDF or is corrupted.`);
      } else if (error.message.includes('password')) {
        throw new Error(`The PDF is password protected. Please upload an unprotected PDF.`);
      } else {
        throw new Error(`PDF processing failed: ${error.message}`);
      }
    }
    
    throw new Error(`PDF processing failed: Unknown error occurred`);
  }
}

/**
 * Process DOCX files using LangChain DOCX loader
 */
async function processDOCX(file: File): Promise<string> {
  try {
    console.log('Processing DOCX with LangChain:', file.name, 'Size:', file.size);
    
    // Dynamic import of LangChain DOCX loader (community package)
    const { DocxLoader } = await import('@langchain/community/document_loaders/fs/docx');
    
    // Convert File to Blob for LangChain
    const blob = new Blob([await file.arrayBuffer()], { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    // Create DOCX loader
    const loader = new DocxLoader(blob);
    
    // Load and parse the DOCX
    const docs = await loader.load();
    console.log('DOCX loaded. Number of sections:', docs.length);
    
    // Combine all sections into single text
    const fullText = docs.map(doc => doc.pageContent).join('\n\n');
    
    if (!fullText.trim()) {
      throw new Error('No text content could be extracted from the DOCX file.');
    }
    
    console.log('DOCX processing complete. Text length:', fullText.length);
    return fullText.trim();
    
  } catch (error) {
    console.error('DOCX processing error:', error);
    if (error instanceof Error) {
      throw new Error(`DOCX processing failed: ${error.message}`);
    }
    throw new Error('DOCX processing failed: Unknown error occurred');
  }
}

/**
 * Process plain text files
 */
async function processText(file: File): Promise<string> {
  return await file.text();
}

/**
 * Break document content into smaller pieces (chunks)
 * Simple but better chunking with more context awareness
 */
async function createChunks(content: string, filename: string): Promise<string[]> {
  let cleanContent = content.trim().replace(/  +/g, ' ');
  
  const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters');
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2000,        // Larger chunks for better context
    chunkOverlap: 400,      // More overlap for continuity
    separators: [           // Better separators for any document type
      '\n\n\n',            // Paragraph breaks
      '\n\n',              // Double line breaks  
      '\n',                // Single line breaks
      '. ',                // Sentence endings
      ' ',                 // Word boundaries
      ''                   // Character level (last resort)
    ],
  });
  
  const rawChunks = await splitter.splitText(cleanContent);
  return rawChunks.map(chunk => addContext(chunk, filename));
}

/**
 * Add document context to chunks for better retrieval
 */
function addContext(chunk: string, filename: string): string {
  const docName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  return `Document: ${docName}\n\n${chunk}`;
}

/**
 * Get supported file types
 */
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'text/plain': 'txt',
  'text/markdown': 'md',
} as const;

/**
 * Validate if file type is supported
 */

export function isFileTypeSupported(
  file: File | string
): boolean {
  const fileName = typeof file === "string" ? file : file?.name;

  if (!fileName || typeof fileName !== "string") {
    return false;
  }

  const extension = fileName
    .split(".")
    .pop()
    ?.toLowerCase();

  return ["pdf", "docx", "txt", "md"].includes(
    extension ?? ""
  );
}
