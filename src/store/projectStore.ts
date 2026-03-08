import { create } from 'zustand';
import { Project } from '../types';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  serverTimestamp,
  addDoc
} from 'firebase/firestore';

interface ProjectState {
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  setCurrentProject: (project: Project | null) => void;
  createProject: (userId: string, toolData: Project['toolData']) => Promise<string>;
  updateProjectStep: (projectId: string, step: number, data?: Partial<Project>) => Promise<void>;
  approveStep: (projectId: string, step: number, userId: string, notes?: string) => Promise<void>;
  loadProject: (projectId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  loading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),

  createProject: async (userId, toolData) => {
    set({ loading: true, error: null });
    try {
      const projectRef = doc(collection(db, 'projects'));
      const newProject: Project = {
        id: projectRef.id,
        userId,
        status: 'draft',
        currentStep: 2,
        toolData,
        assets: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(projectRef, newProject);
      set({ currentProject: newProject, loading: false });
      return projectRef.id;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateProjectStep: async (projectId, step, data = {}) => {
    set({ loading: true, error: null });
    try {
      const projectRef = doc(db, 'projects', projectId);
      const updateData = {
        ...data,
        currentStep: step,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(projectRef, updateData);
      
      const updatedDoc = await getDoc(projectRef);
      set({ currentProject: updatedDoc.data() as Project, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  approveStep: async (projectId, step, userId, notes = '') => {
    try {
      await addDoc(collection(db, 'approvals'), {
        projectId,
        step,
        userId,
        action: 'approved',
        notes,
        timestamp: serverTimestamp(),
      });
    } catch (error: any) {
      console.error('Approval error:', error);
    }
  },

  loadProject: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        set({ currentProject: projectDoc.data() as Project, loading: false });
      } else {
        set({ error: 'Project not found', loading: false });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
}));
