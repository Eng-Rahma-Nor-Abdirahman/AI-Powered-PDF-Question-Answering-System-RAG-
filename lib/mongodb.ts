import mongoose from 'mongoose';

// Simple Mongoose connection
let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB with Mongoose');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Document Schema
const DocumentSchema = new mongoose.Schema({
  documentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  filename: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  status: { 
    type: String, 
    enum: ['uploading', 'processing', 'completed', 'error'],
    default: 'uploading'
  },
  errorMessage: { type: String },
  chunkCount: { type: Number },
  vectorCount: { type: Number }
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Message Schema for chat
const MessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  conversationId: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  documentId: { type: String },
  context: { type: String }
});

// Models
export const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// Simple CRUD operations
export async function createDocument(doc: any): Promise<any> {
  await connectDB();
  return await Document.create(doc);
}

export async function getDocument(documentId: string): Promise<any> {
  await connectDB();
  return await Document.findOne({ documentId });
}

export async function getAllDocuments(): Promise<any[]> {
  await connectDB();
  return await Document.find({}).sort({ uploadedAt: -1 });
}

export async function updateDocument(documentId: string, updates: any): Promise<any> {
  await connectDB();
  return await Document.findOneAndUpdate(
    { documentId },
    updates,
    { new: true }
  );
}

export async function deleteDocument(documentId: string): Promise<any> {
  await connectDB();
  return await Document.findOneAndDelete({ documentId });
}

// Message operations
export async function saveMessage(message: any): Promise<any> {
  await connectDB();
  return await Message.create(message);
}

export async function getMessages(conversationId: string): Promise<any[]> {
  await connectDB();
  return await Message.find({ conversationId }).sort({ createdAt: 1 });
}