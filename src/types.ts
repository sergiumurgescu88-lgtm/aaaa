export type UserRole = 'admin' | 'editor' | 'viewer';
export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  plan: UserPlan;
  createdAt: any;
  lastLogin: any;
}

export interface Project {
  id: string;
  userId: string;
  status: string;
  currentStep: number;
  toolData: {
    name: string;
    url: string;
    description: string;
    audience: string[];
    goal: string;
    duration: string | number;
    category: string;
    scriptType: string;
  };
  assets: {
    script?: { status: string; content: any; approved: boolean; versions: any[] };
    audio?: { status: string; url?: string; duration?: number; approved: boolean; versions?: any[]; voiceSettings?: any };
    thumbnails?: { status: string; options: string[]; selected: string; approved: boolean };
    video?: { status: string; url?: string; duration?: number; approved: boolean; versions?: any[] };
    seo?: { status: string; content: any; approved: boolean };
    social?: { status: string; platforms: string[]; approved: boolean };
  };
  botatoWorkflow?: {
    workflowId: string;
    status: string;
    scheduledPosts: any[];
    publishedPosts: any[];
  };
  createdAt: any;
  updatedAt: any;
  publishedAt?: any;
}

export interface Approval {
  id: string;
  projectId: string;
  step: number;
  userId: string;
  action: 'approved' | 'refined' | 'edited' | 'rejected';
  notes?: string;
  timestamp: any;
}

export interface AnalyticsData {
  id: string;
  userId: string;
  views: number;
  platform: string;
  date: string;
}

