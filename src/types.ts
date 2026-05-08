export type UserRole = 'superadmin' | 'admin' | 'user';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  role: UserRole;
  guildId: string;
  allowedGuilds?: string[];
  cityIds?: string[];
  createdAt: any;
}

export type IssuePriority = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Issue {
  id: string;
  guildId: string;
  cityId?: string;
  cityName?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  areaId: string;
  areaName: string;
  priority: IssuePriority;
  status: IssueStatus;
  userId: string;
  userName: string;
  userEmail: string;
  reportedBy?: string;
  affectedPeople?: string[];
  reportsCount?: number;
  reporters?: string[];
  assignedTo?: string;
  assignedToName?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: any;
  updatedAt: any;
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
  note?: string;
  createdAt: string;
}

export interface City {
  id: string;
  guildId: string;
  name: string;
}

export interface Route {
  id: string;
  cityId: string;
  name: string;
}

export interface Category {
  id: string;
  guildId: string;
  name: string;
}

export interface Brand {
  id: string;
  guildId: string;
  name: string;
  type: string; // 'Celular', 'Impresora Térmica', etc.
}

export interface Motif {
  id: string;
  guildId: string;
  name: string;
}

export interface EquipmentExchange {
  id: string;
  guildId: string;
  cityId: string;
  cityName: string;
  routeId: string;
  routeName: string;
  equipmentType: string; // 'Celular', 'Impresora Térmica'
  brandId: string;
  brandName: string;
  motifId: string;
  motifName: string;
  oldEquipment?: string;
  newEquipment?: string;
  price?: number;
  userId: string;
  userName: string;
  userEmail: string;
  affectedPerson: string;
  createdAt: any;
  updatedAt: any;
}

export interface Guild {
  id: string; // The code
  name: string;
  createdAt: string;
}

export interface Area {
  id: string;
  guildId: string;
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
