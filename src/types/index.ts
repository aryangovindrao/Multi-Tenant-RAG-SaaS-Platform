// ─── Core Domain Types ──────────────────────────────────────────────────────

export type Role = "ADMIN" | "EDITOR" | "VIEWER";

export type DocumentStatus =
  | "UPLOADING"
  | "QUEUED"
  | "PROCESSING"
  | "EMBEDDING"
  | "READY"
  | "FAILED";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  role: Role; // current user's role within this org
  memberCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  user: User;
  role: Role;
  joinedAt: string;
  status: "ACTIVE" | "INVITED";
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  invitedBy: string;
  expiresAt: string;
}

// ─── Documents ──────────────────────────────────────────────────────────────

export interface Document {
  id: string;
  name: string;
  sizeBytes: number;
  pageCount: number | null;
  status: DocumentStatus;
  progress: number; // 0-100 while processing
  mimeType: string;
  uploadedBy: User;
  chunkCount: number | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface Citation {
  documentId: string;
  documentName: string;
  page: number;
  snippet: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  createdAt: string;
  /** true while tokens are still streaming in */
  isStreaming?: boolean;
  /** set when generation failed or was aborted */
  error?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  documentIds: string[];
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard & Analytics ──────────────────────────────────────────────────

export interface DashboardStats {
  documentCount: number;
  documentDelta: number; // % change vs previous period
  queryCount: number;
  queryDelta: number;
  activeUsers: number;
  activeUsersDelta: number;
  storageUsedBytes: number;
  storageLimitBytes: number;
}

export interface ActivityEvent {
  id: string;
  type:
    | "DOCUMENT_UPLOADED"
    | "DOCUMENT_DELETED"
    | "QUERY_EXECUTED"
    | "MEMBER_JOINED"
    | "MEMBER_INVITED"
    | "ORG_UPDATED";
  actor: Pick<User, "id" | "name" | "avatarUrl">;
  description: string;
  createdAt: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AnalyticsOverview {
  queriesOverTime: TimeSeriesPoint[];
  activeUsersOverTime: TimeSeriesPoint[];
  tokensOverTime: { date: string; input: number; output: number }[];
  topDocuments: { documentId: string; name: string; references: number }[];
  totalTokens: number;
  avgResponseMs: number;
  totalQueries: number;
}

// ─── API Envelope ───────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** epoch ms when the access token expires */
  expiresAt: number;
}

export interface LoginResponse extends AuthTokens {
  user: User;
  organizations: Organization[];
}
