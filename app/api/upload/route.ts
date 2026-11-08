
import { NextRequest, NextResponse } from "next/server";

import {
  processDocument,
  isFileTypeSupported,
} from "@/lib/document-processor";

import { storeVectors } from "@/lib/pinecone";

import {
  createDocument,
  updateDocument,
} from "@/lib/mongodb";


const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  let documentId = "";
  let documentCreated = false;

  try {
    // 1. Get the uploaded file
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please upload a valid file.",
        },
        { status: 400 }
      );
    }

    // 2. Validate file size
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "The uploaded file is empty.",
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "File size must not exceed 100 MB.",
        },
        { status: 413 }
      );
    }

    // 3. Validate supported file types
    if (!isFileTypeSupported(file.name)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only PDF, DOCX, TXT, and MD files are supported.",
        },
        { status: 400 }
      );
    }

    // 4. Prepare document information
    documentId = crypto.randomUUID();

    const filename = file.name;
    const fileType =
      filename.split(".").pop()?.toLowerCase() ?? "unknown";

    const title = filename.replace(/\.[^/.]+$/, "");

    // 5. Save document information in MongoDB
    await createDocument({
      documentId,
      title,
      filename,
      fileType,
      fileSize: file.size,
      uploadedAt: new Date(),
      status: "processing",
    });

    documentCreated = true;

    // 6. Extract text and create chunks
    const { content, chunks } = await processDocument(file);

    if (!content.trim() || chunks.length === 0) {
      await updateDocument(documentId, {
        status: "error",
        errorMessage: "No readable text was extracted from the file.",
      });

      return NextResponse.json(
        {
          success: false,
          documentId,
          error: "No readable text was found in the uploaded file.",
        },
        { status: 422 }
      );
    }

    // 7. Store chunks in Pinecone Integrated Embedding
    const vectorCount = await storeVectors(
      documentId,
      chunks,
      {
        title,
        filename,
        fileType,
      }
    );

    // 8. Update MongoDB document status
    await updateDocument(documentId, {
      status: "completed",
      processedAt: new Date(),
      chunkCount: chunks.length,
      vectorCount,
    });

    // 9. Return success response
    return NextResponse.json(
      {
        success: true,
        documentId,
        filename,
        message: "Document uploaded and processed successfully.",
        stats: {
          originalSize: file.size,
          chunkCount: chunks.length,
          vectorCount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Document upload error:", error);

    // Save the error in MongoDB if the document was created
    if (documentCreated && documentId) {
      try {
        await updateDocument(documentId, {
          status: "error",
          errorMessage:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred.",
        });
      } catch (updateError) {
        console.error(
          "Failed to update document status:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        documentId: documentId || undefined,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while uploading the file.",
      },
      { status: 500 }
    );
  }
}
