export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  createdAt: string;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  title: string;
  description: string;
  areaId: string;
  areaName: string;
  priority: IssuePriority;
  status: IssueStatus;
  userId: string;
  userName: string;
  userEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface IssueEvent {
  id: string;
  issueId: string;
  type: 'status_change' | 'comment' | 'assignment' | 'creation';
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  from?: string;
  to?: string;
  createdAt: string;
}

export interface Area {
  id: string;
  name: string;
  color: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
