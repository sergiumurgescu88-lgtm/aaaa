import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { Project } from '../types';
import { 
  AnimatePresence, 
  motion 
} from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { generateScripts, generateThumbnails, generateSEO } from '../services/geminiService';

// Step definitions
const STEPS = [
  { id: 1, label: 'Strategy', emoji: '🎯' },
  { id: 2, label: 'Input', emoji: '📝' },
  { id: 3, label: 'Script', emoji: '✨' },
  { id: 4, label: 'Audio', emoji: '🎙️' },
  { id: 5, label: 'Thumb', emoji: '🖼️' },
  { id: 6, label: 'Video', emoji: '🎬' },
  { id: 7, label: 'SEO', emoji: '🔍' },
  { id: 8, label: 'Social', emoji: '📱' },
  { id: 9, label: 'Review', emoji: '✅' },
  { id: 10, label: 'Publish', emoji: '🚀' },
];

const toolSchema = z.object({
  name: z.string().min(3, "Numele trebuie să aibă minim 3 caractere").max(100, "Maxim 100 caractere"),
  url: z.string().url("URL invalid"),
  description: z.string().min(100, "Descrierea trebuie să aibă minim 100 de caractere").max(1000, "Maxim 1000 caractere"),
  audience: z.array(z.string()).min(1, "Selectează minim o audiență"),
  duration: z.union([z.string(), z.number()]),
  category: z.string(),
  goal: z.string(),
  scriptType: z.string(),
});

const AUDIENCE_OPTIONS = ['B2B', 'B2C', 'Agencies', 'Freelancers', 'Startups', 'Enterprise'];
const CATEGORY_OPTIONS = ['Marketing', 'SEO', 'Auto', 'Real Estate', 'Trading', 'Food', 'Automation', 'Other'];
const GOAL_OPTIONS = ['Awareness', 'Leads', 'Sales', 'Demo Requests', 'Signups'];
const DURATION_OPTIONS = [
  { label: '60s (Short)', value: '60' },
  { label: '180s (Medium)', value: '180' },
  { label: '300s (Long)', value: '300' },
];

const Tooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-block ml-1">
    <span className="cursor-help text-white/40 hover:text-white transition-colors">ℹ️</span>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-surface text-[10px] text-white/80 rounded-lg border border-white/10 shadow-xl z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-surface" />
    </div>
  </div>
);

const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number, totalSteps: number }) => (
  <div className="flex flex-col items-center space-y-4 mb-12">
    <div className="flex items-center space-x-2">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <React.Fragment key={i}>
          <div 
            className={`w-3 h-3 rounded-full transition-all duration-500 ${
              i + 1 < currentStep ? 'bg-success' : 
              i + 1 === currentStep ? 'bg-accent electric-glow scale-125' : 
              'bg-white/10'
            }`} 
          />
          {i < totalSteps - 1 && (
            <div className={`w-8 h-0.5 transition-all duration-500 ${
              i + 1 < currentStep ? 'bg-success/30' : 'bg-white/5'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
    <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Step {currentStep} of {totalSteps}</span>
  </div>
);

export const ContentFactoryWizard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentProject, loading, loadProject, createProject, updateProjectStep, approveStep } = useProjectStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [refinementText, setRefinementText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState<any>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId, loadProject]);

  const currentStep = currentProject?.currentStep || 2;

  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm({
    resolver: zodResolver(toolSchema),
    defaultValues: currentProject?.toolData || {
      audience: [],
      duration: "180",
      category: "Marketing",
      goal: "Awareness",
      scriptType: "podcast",
    }
  });

  const formValues = watch();
  const [lastSavedValues, setLastSavedValues] = useState<any>(null);

  // Auto-save logic
  useEffect(() => {
    if (!projectId || !user || currentStep !== 2) return;

    const timer = setInterval(async () => {
      const currentValues = JSON.stringify(formValues);
      if (currentValues !== lastSavedValues) {
        try {
          await updateProjectStep(projectId, 2, { toolData: formValues as Project['toolData'] });
          setLastSavedValues(currentValues);
          console.log('Draft auto-saved');
        } catch (error) {
          console.error('Auto-save failed', error);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, [projectId, user, currentStep, formValues, lastSavedValues, updateProjectStep]);

  // Sync form with project data when loaded
  useEffect(() => {
    if (currentProject?.toolData) {
      Object.entries(currentProject.toolData).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    }
  }, [currentProject, setValue]);

  const onToolSubmit = async (data: any) => {
    if (!user) return;
    
    try {
      if (!projectId) {
        const newId = await createProject(user.id, data);
        navigate(`/factory/${newId}`);
      } else {
        await updateProjectStep(projectId, 3, { toolData: data });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleApproveScript = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 3, user.id);
    await updateProjectStep(projectId, 4);
  };

  const handleApproveAudio = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 4, user.id);
    await updateProjectStep(projectId, 5);
  };

  const handleApproveThumbnail = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 5, user.id);
    await updateProjectStep(projectId, 6);
  };

  const handleApproveVideo = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 6, user.id);
    await updateProjectStep(projectId, 7);
  };

  const handleApproveSEO = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 7, user.id);
    await updateProjectStep(projectId, 8);
  };

  const handleApproveSocial = async () => {
    if (!projectId || !user) return;
    await approveStep(projectId, 8, user.id);
    await updateProjectStep(projectId, 9);
  };

  const handlePublish = async () => {
    if (!projectId || !user) return;
    setIsGenerating(true);
    try {
      // Simulate Botato Integration
      await new Promise(resolve => setTimeout(resolve, 3000));
      await approveStep(projectId, 9, user.id);
      await updateProjectStep(projectId, 10, { status: 'completed' });
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!projectId || !currentProject) return;
    setIsGenerating(true);
    try {
      // Simulate Video Generation (Veo 3)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      await updateProjectStep(projectId, 6, {
        assets: {
          ...currentProject.assets,
          video: {
            status: 'review',
            url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', // Placeholder
            approved: false
          }
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateSEO = async () => {
    if (!projectId || !currentProject) return;
    setIsGenerating(true);
    try {
      const result = await generateSEO(currentProject.toolData);
      
      await updateProjectStep(projectId, 7, {
        assets: {
          ...currentProject.assets,
          seo: {
            status: 'review',
            content: result,
            approved: false
          }
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!projectId || !currentProject) return;
    setIsGenerating(true);
    try {
      // Simulate Audio Generation for now
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await updateProjectStep(projectId, 4, {
        assets: {
          ...currentProject.assets,
          audio: {
            status: 'review',
            url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Placeholder
            approved: false,
            voiceSettings: {
              alina: 'Kore',
              sergiu: 'Fenrir'
            }
          }
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateThumbnails = async () => {
    if (!projectId || !currentProject) return;
    setIsGenerating(true);
    try {
      const prompt = `Marketing thumbnail for ${currentProject.toolData.name}: ${currentProject.toolData.description.substring(0, 100)}`;
      const images = await generateThumbnails(prompt);
      
      await updateProjectStep(projectId, 5, {
        assets: {
          ...currentProject.assets,
          thumbnails: {
            status: 'review',
            options: images,
            selected: images[0],
            approved: false
          }
        }
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScript = async (instructions?: string) => {
    if (!projectId || !currentProject) return;
    setIsGenerating(true);
    try {
      const result = await generateScripts({
        toolName: currentProject.toolData.name,
        toolUrl: currentProject.toolData.url,
        description: currentProject.toolData.description + (instructions ? `\n\nREFINEMENT INSTRUCTIONS: ${instructions}` : ''),
        targetAudience: currentProject.toolData.audience,
        duration: currentProject.toolData.duration,
        category: currentProject.toolData.category,
        goal: currentProject.toolData.goal,
        scriptType: currentProject.toolData.scriptType as any,
      });
      
      await updateProjectStep(projectId, 3, {
        assets: {
          ...currentProject.assets,
          script: {
            status: 'review',
            content: result,
            approved: false,
            versions: [...(currentProject.assets?.script?.versions || []), result]
          }
        }
      });
      setIsRefining(false);
      setRefinementText('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveManualEdit = async () => {
    if (!projectId || !currentProject || !editingContent) return;
    
    const updatedAssets = { ...currentProject.assets };
    if (currentStep === 3) {
      updatedAssets.script = {
        ...updatedAssets.script,
        content: {
          ...updatedAssets.script.content,
          variationA: {
            ...updatedAssets.script.content.variationA,
            content: editingContent
          }
        }
      };
    } else if (currentStep === 7) {
      updatedAssets.seo = {
        ...updatedAssets.seo,
        content: editingContent
      };
    }

    await updateProjectStep(projectId, currentStep, { assets: updatedAssets });
    setIsEditing(false);
  };

  if (loading && !currentProject) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} totalSteps={STEPS.length} />

      {/* Refinement Modal */}
      <AnimatePresence>
        {isRefining && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-dark/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-lg p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">Refine Generation</h3>
                <button onClick={() => setIsRefining(false)} className="text-white/40 hover:text-white text-2xl">
                  ❌
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-white/60">What would you like to change? Be specific for better results.</p>
                <textarea 
                  value={refinementText}
                  onChange={(e) => setRefinementText(e.target.value)}
                  placeholder="e.g., Make it more professional, add more technical details about the API..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 h-32 focus:border-accent outline-none resize-none"
                />
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => setIsRefining(false)}
                  className="flex-1 py-3 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (currentStep === 3) handleGenerateScript(refinementText);
                    // Add other step refinements here
                  }}
                  disabled={!refinementText.trim() || isGenerating}
                  className="flex-1 bg-accent text-bg-dark font-bold py-3 rounded-xl electric-glow disabled:opacity-50"
                >
                  {isGenerating ? 'Regenerating...' : 'Regenerate'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Step Content */}
      <div className="min-h-[60vh]">
        <AnimatePresence mode="wait">
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Tool Information</h2>
                  <span className="text-xs font-bold text-white/20 uppercase tracking-widest">Step 2 of 10</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60 flex items-center">
                      Tool Name *
                      <Tooltip text="The official name of your tool or product." />
                    </label>
                    <input 
                      {...register('name')} 
                      placeholder="e.g., One Image Ad Engine"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:border-accent outline-none transition-all ${errors.name ? 'border-alert/50' : 'border-white/10'}`} 
                    />
                    <div className="flex justify-between items-center">
                      {errors.name && <p className="text-xs text-alert">{errors.name.message as string}</p>}
                      <span className={`text-[10px] ml-auto font-mono ${
                        (watch('name')?.length || 0) < 3 ? 'text-alert' :
                        (watch('name')?.length || 0) > 90 ? 'text-alert' : 
                        (watch('name')?.length || 0) > 70 ? 'text-yellow-500' : 'text-success'
                      }`}>
                        {watch('name')?.length || 0}/100
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60 flex items-center">
                      Tool URL *
                      <Tooltip text="The link where users can access your tool." />
                    </label>
                    <input 
                      {...register('url')} 
                      placeholder="https://ssocial.eu/tool"
                      className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:border-accent outline-none transition-all ${errors.url ? 'border-alert/50' : 'border-white/10'}`} 
                    />
                    {errors.url && <p className="text-xs text-alert">{errors.url.message as string}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-white/60 flex items-center">
                    Description *
                    <Tooltip text="Describe what the tool does and its main benefits. Min 100 chars." />
                  </label>
                  <textarea 
                    {...register('description')} 
                    rows={5} 
                    placeholder="Describe your tool in detail..."
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 focus:border-accent outline-none resize-none transition-all ${errors.description ? 'border-alert/50' : 'border-white/10'}`} 
                  />
                  <div className="flex justify-between items-center">
                    {errors.description && <p className="text-xs text-alert">{errors.description.message as string}</p>}
                    <span className={`text-[10px] ml-auto font-mono ${
                      (watch('description')?.length || 0) < 100 ? 'text-alert' : 
                      (watch('description')?.length || 0) > 900 ? 'text-alert' :
                      (watch('description')?.length || 0) > 700 ? 'text-yellow-500' : 'text-success'
                    }`}>
                      {watch('description')?.length || 0}/1000
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold text-white/60 flex items-center">
                    Target Audience *
                    <Tooltip text="Who is this tool for? Select all that apply." />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {AUDIENCE_OPTIONS.map(option => {
                      const isSelected = watch('audience')?.includes(option);
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            const current = watch('audience') || [];
                            if (isSelected) {
                              setValue('audience', current.filter(a => a !== option));
                            } else {
                              setValue('audience', [...current, option]);
                            }
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                            isSelected 
                              ? 'bg-accent border-accent text-bg-dark' 
                              : 'border-white/10 text-white/40 hover:border-white/30'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                  {errors.audience && <p className="text-xs text-alert">{errors.audience.message as string}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60 flex items-center">
                      Category *
                      <Tooltip text="The industry or niche of your tool." />
                    </label>
                    <select {...register('category')} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none cursor-pointer">
                      {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60 flex items-center">
                      Primary Goal *
                      <Tooltip text="What do you want to achieve with this content?" />
                    </label>
                    <select {...register('goal')} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none cursor-pointer">
                      {GOAL_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-white/60 flex items-center">
                      Video Duration *
                      <Tooltip text="The length of the generated marketing video." />
                    </label>
                    <select {...register('duration')} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none cursor-pointer">
                      {DURATION_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleSubmit(onToolSubmit)}
                  disabled={loading}
                  className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-3 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{projectId ? 'Save & Generate Script' : 'Create & Continue'}</span>
                      <span className="text-xl">➡️</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!currentProject?.assets?.script ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-accent/10 text-accent rounded-full animate-pulse text-4xl">
                    ✨
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Ready to generate your script?</h3>
                    <p className="text-white/40 max-w-md">Our AI will create a high-converting podcast dialogue between Alina and Sergiu.</p>
                  </div>
                  <button 
                    onClick={() => handleGenerateScript()}
                    disabled={isGenerating}
                    className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">🪄</span>}
                    <span>{isGenerating ? 'Generating...' : 'Generate Script Now'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">Script Preview</h2>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setIsEditing(!isEditing);
                            setEditingContent(currentProject.assets.script.content.variationA.content);
                          }}
                          className={`p-2 rounded-lg transition-all ${isEditing ? 'bg-accent text-bg-dark' : 'bg-white/5 text-white/40 hover:text-white'}`}
                        >
                          <span className="text-xl">📝</span>
                        </button>
                      </div>
                    </div>
                    {isEditing ? (
                      <textarea 
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="glass-card p-8 w-full min-h-[500px] font-mono text-sm leading-relaxed bg-white/5 border border-accent outline-none resize-none"
                      />
                    ) : (
                      <div className="glass-card p-8 min-h-[500px] font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {currentProject.assets.script.content.variationA.content}
                      </div>
                    )}
                  </div>
                  <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                      <h4 className="font-bold">Approval Required</h4>
                      <p className="text-xs text-white/40">Review the script carefully. Once approved, we'll proceed to audio generation.</p>
                      {isEditing ? (
                        <button 
                          onClick={handleSaveManualEdit}
                          className="w-full bg-accent text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                        >
                          <span className="text-xl">✅</span>
                          <span>Save Changes</span>
                        </button>
                      ) : (
                        <button 
                          onClick={handleApproveScript}
                          className="w-full bg-success text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                        >
                          <span className="text-xl">✅</span>
                          <span>Approve & Continue</span>
                        </button>
                      )}
                      {!isEditing && (
                        <>
                          <button 
                            onClick={() => setIsRefining(true)}
                            className="w-full py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                          >
                            Refine Script
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditing(true);
                              setEditingContent(currentProject.assets.script.content.variationA.content);
                            }}
                            className="w-full py-4 text-white/40 text-xs hover:text-white transition-all"
                          >
                            Edit Manually
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!currentProject?.assets?.audio ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-accent/10 text-accent rounded-full animate-pulse text-4xl">
                    🎙️
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Generate Professional Audio</h3>
                    <p className="text-white/40 max-w-md">We'll use high-quality neural voices for Alina and Sergiu to bring your script to life.</p>
                  </div>
                  <button 
                    onClick={handleGenerateAudio}
                    disabled={isGenerating}
                    className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">🎙️</span>}
                    <span>{isGenerating ? 'Generating Audio...' : 'Generate Audio Now'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold">Audio Preview</h2>
                    <div className="glass-card p-12 flex flex-col items-center justify-center space-y-8">
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-accent electric-glow" />
                      </div>
                      <audio controls className="w-full" src={currentProject.assets.audio.url} />
                      <div className="flex space-x-12">
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-accent text-2xl">
                            🎙️
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Alina (Host)</p>
                        </div>
                        <div className="text-center space-y-2">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-accent text-2xl">
                            🎙️
                          </div>
                          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Sergiu (Founder)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                      <h4 className="font-bold">Approve Audio</h4>
                      <p className="text-xs text-white/40">Listen to the full generation. If you're happy with the voices and pacing, approve to proceed.</p>
                      <button 
                        onClick={handleApproveAudio}
                        className="w-full bg-success text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                      >
                        <span className="text-xl">✅</span>
                        <span>Approve & Continue</span>
                      </button>
                      <button 
                        onClick={() => setIsRefining(true)}
                        className="w-full py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                      >
                        Adjust Voice
                      </button>
                      <button className="w-full py-4 text-white/40 text-xs hover:text-white transition-all">
                        Upload Custom Audio
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!currentProject?.assets?.thumbnails ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-accent/10 text-accent rounded-full animate-pulse text-4xl">
                    🖼️
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Create Viral Thumbnails</h3>
                    <p className="text-white/40 max-w-md">Our AI will generate multiple high-impact thumbnail options for your video.</p>
                  </div>
                  <button 
                    onClick={handleGenerateThumbnails}
                    disabled={isGenerating}
                    className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">🪄</span>}
                    <span>{isGenerating ? 'Creating Thumbnails...' : 'Generate Thumbnails'}</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Select Thumbnail</h2>
                    <button 
                      onClick={handleGenerateThumbnails}
                      className="text-accent text-sm font-bold flex items-center space-x-2"
                    >
                      <span className="text-xl">✨</span>
                      <span>Regenerate Options</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {currentProject.assets.thumbnails.options.map((img: string, idx: number) => (
                      <div 
                        key={idx}
                        onClick={() => updateProjectStep(projectId!, 5, {
                          assets: {
                            ...currentProject.assets,
                            thumbnails: {
                              ...currentProject.assets.thumbnails,
                              selected: img
                            }
                          }
                        })}
                        className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                          currentProject.assets.thumbnails.selected === img ? 'border-accent scale-105 shadow-lg shadow-accent/20' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {currentProject.assets.thumbnails.selected === img && (
                          <div className="absolute top-2 right-2 bg-accent text-bg-dark p-1 rounded-full">
                            <span className="text-xs">✅</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end space-x-4">
                    <button 
                      onClick={() => setIsRefining(true)}
                      className="py-4 px-8 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                    >
                      Refine Prompt
                    </button>
                    <button 
                      className="py-4 px-8 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all text-white/40"
                    >
                      Edit in Canva
                    </button>
                    <button 
                      onClick={handleApproveThumbnail}
                      className="bg-success text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 hover:scale-105 transition-all"
                    >
                      <span className="text-xl">✅</span>
                      <span>Approve Selected & Continue</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!currentProject?.assets?.video ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-accent/10 text-accent rounded-full animate-pulse text-4xl">
                    🎬
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Generate AI Video</h3>
                    <p className="text-white/40 max-w-md">We'll combine your audio, script, and visual elements into a professional marketing video.</p>
                  </div>
                  <button 
                    onClick={handleGenerateVideo}
                    disabled={isGenerating}
                    className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">🎬</span>}
                    <span>{isGenerating ? 'Rendering Video...' : 'Generate Video Now'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold">Video Preview</h2>
                    <div className="glass-card aspect-video overflow-hidden relative">
                      <video controls className="w-full h-full object-cover" src={currentProject.assets.video.url} />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                      <h4 className="font-bold">Approve Video</h4>
                      <p className="text-xs text-white/40">Watch the final render. If everything looks perfect, approve to move to SEO optimization.</p>
                      <button 
                        onClick={handleApproveVideo}
                        className="w-full bg-success text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                      >
                        <span className="text-xl">✅</span>
                        <span>Approve & Continue</span>
                      </button>
                      <button 
                        onClick={() => setIsRefining(true)}
                        className="w-full py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                      >
                        Adjust Scenes
                      </button>
                      <button className="w-full py-4 text-white/40 text-xs hover:text-white transition-all">
                        Upload Custom Video
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {!currentProject?.assets?.seo ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-6">
                  <div className="p-6 bg-accent/10 text-accent rounded-full animate-pulse text-4xl">
                    🔍
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">SEO Optimization</h3>
                    <p className="text-white/40 max-w-md">Generate optimized titles, descriptions, and tags to ensure your content reaches the right audience.</p>
                  </div>
                  <button 
                    onClick={handleGenerateSEO}
                    disabled={isGenerating}
                    className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">🪄</span>}
                    <span>{isGenerating ? 'Optimizing SEO...' : 'Generate SEO Content'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold">Suggested Titles</h3>
                        <button 
                          onClick={() => {
                            setIsEditing(!isEditing);
                            setEditingContent(currentProject.assets.seo.content);
                          }}
                          className="text-accent text-xs font-bold"
                        >
                          {isEditing ? 'Cancel Edit' : 'Edit SEO'}
                        </button>
                      </div>
                      {isEditing ? (
                        <div className="space-y-4">
                          {editingContent.titles.map((title: string, idx: number) => (
                            <input 
                              key={idx}
                              value={title}
                              onChange={(e) => {
                                const newTitles = [...editingContent.titles];
                                newTitles[idx] = e.target.value;
                                setEditingContent({ ...editingContent, titles: newTitles });
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {currentProject.assets.seo.content.titles.map((title: string, idx: number) => (
                            <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-accent cursor-pointer transition-all">
                              {title}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="glass-card p-8 space-y-6">
                      <h3 className="text-xl font-bold">Description</h3>
                      {isEditing ? (
                        <textarea 
                          value={editingContent.description}
                          onChange={(e) => setEditingContent({ ...editingContent, description: e.target.value })}
                          rows={10}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none text-sm"
                        />
                      ) : (
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 whitespace-pre-wrap text-sm text-white/60">
                          {currentProject.assets.seo.content.description}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                      <h4 className="font-bold">Approve SEO</h4>
                      <p className="text-xs text-white/40">Review the generated metadata. You can edit these later in the final review step.</p>
                      {isEditing ? (
                        <button 
                          onClick={handleSaveManualEdit}
                          className="w-full bg-accent text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                        >
                          <span className="text-xl">✅</span>
                          <span>Save Changes</span>
                        </button>
                      ) : (
                        <button 
                          onClick={handleApproveSEO}
                          className="w-full bg-success text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 hover:scale-105 transition-all"
                        >
                          <span className="text-xl">✅</span>
                          <span>Approve & Continue</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentStep === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 space-y-6">
                <h2 className="text-2xl font-bold">Social Media Connections</h2>
                <p className="text-white/40">Select the platforms where you want to publish this content automatically via Botato.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { id: 'tiktok', name: 'TikTok', icon: '🎵' },
                    { id: 'instagram', name: 'Instagram', icon: '📸' },
                    { id: 'facebook', name: 'Facebook', icon: '👥' },
                    { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
                    { id: 'youtube', name: 'YouTube', icon: '🎥' },
                    { id: 'twitter', name: 'X (Twitter)', icon: '🐦' },
                  ].map((platform) => (
                    <div 
                      key={platform.id}
                      onClick={() => {
                        const currentPlatforms = currentProject?.assets?.social?.platforms || [];
                        const newPlatforms = currentPlatforms.includes(platform.id)
                          ? currentPlatforms.filter((p: string) => p !== platform.id)
                          : [...currentPlatforms, platform.id];
                        
                        updateProjectStep(projectId!, 8, {
                          assets: {
                            ...currentProject?.assets,
                            social: {
                              status: 'review',
                              platforms: newPlatforms,
                              approved: false
                            }
                          }
                        });
                      }}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all flex items-center space-x-4 ${
                        currentProject?.assets?.social?.platforms?.includes(platform.id)
                          ? 'border-accent bg-accent/5'
                          : 'border-white/5 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <span className="text-2xl">{platform.icon}</span>
                      <span className="font-bold">{platform.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  disabled={!currentProject?.assets?.social?.platforms?.length}
                  onClick={handleApproveSocial}
                  className="bg-accent text-bg-dark font-bold px-10 py-4 rounded-xl flex items-center space-x-2 electric-glow hover:scale-105 transition-all disabled:opacity-50"
                >
                  <span>Confirm Platforms & Continue</span>
                  <span className="text-xl">➡️</span>
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 9 && (
            <motion.div
              key="step9"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Final Review</h2>
                  <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xl">📝</div>
                        <div>
                          <p className="font-bold">Script</p>
                          <p className="text-xs text-white/40">{currentProject.toolData.duration}s Podcast Script</p>
                        </div>
                      </div>
                      <span className="text-success text-xl">✅</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xl">🎙️</div>
                        <div>
                          <p className="font-bold">Audio</p>
                          <p className="text-xs text-white/40">Neural Voice Generation</p>
                        </div>
                      </div>
                      <span className="text-success text-xl">✅</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xl">🖼️</div>
                        <div>
                          <p className="font-bold">Thumbnail</p>
                          <p className="text-xs text-white/40">AI Generated Visual</p>
                        </div>
                      </div>
                      <span className="text-success text-xl">✅</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-accent/10 text-accent rounded-full flex items-center justify-center text-xl">🎬</div>
                        <div>
                          <p className="font-bold">Video</p>
                          <p className="text-xs text-white/40">1080p Marketing Render</p>
                        </div>
                      </div>
                      <span className="text-success text-xl">✅</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Botato Workflow</h2>
                  <div className="glass-card p-6 space-y-6">
                    <div className="space-y-4">
                      <p className="text-sm text-white/60">Your content will be automatically published to:</p>
                      <div className="flex flex-wrap gap-2">
                        {currentProject.assets?.social?.platforms?.map((p: string) => (
                          <span key={p} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-4">
                      <div className="flex items-center space-x-3 text-accent">
                        <span className="text-xl">✨</span>
                        <p className="font-bold">AI Automation Active</p>
                      </div>
                      <ul className="text-xs space-y-2 text-white/60">
                        <li>• Auto-engagement with comments enabled</li>
                        <li>• AI-powered reply generation active</li>
                        <li>• Cross-platform performance tracking</li>
                      </ul>
                    </div>
                    <button 
                      onClick={handlePublish}
                      disabled={isGenerating}
                      className="w-full bg-accent text-bg-dark font-bold py-4 rounded-xl flex items-center justify-center space-x-2 electric-glow hover:scale-105 transition-all"
                    >
                      {isGenerating ? <div className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">📱</span>}
                      <span>{isGenerating ? 'Publishing...' : 'Approve & Publish Everywhere'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 10 && (
            <motion.div
              key="step10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-20 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center electric-glow text-5xl">
                ✅
              </div>
              <div className="space-y-4">
                <h2 className="text-4xl font-bold">Content Published!</h2>
                <p className="text-white/40 max-w-md mx-auto">
                  Your content has been successfully generated, optimized, and scheduled for publishing across all selected platforms.
                </p>
              </div>
              <div className="flex space-x-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-white/5 hover:bg-white/10 text-white font-bold px-8 py-4 rounded-xl transition-all"
                >
                  Go to Dashboard
                </button>
                <button 
                  onClick={() => navigate('/factory')}
                  className="bg-accent text-bg-dark font-bold px-8 py-4 rounded-xl electric-glow hover:scale-105 transition-all"
                >
                  Start New Project
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-bg-dark/80 backdrop-blur-xl border-t border-white/5 p-4 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button 
            disabled={currentStep <= 2}
            onClick={() => updateProjectStep(projectId!, currentStep - 1)}
            className="px-6 py-2 text-white/40 hover:text-white disabled:opacity-0 transition-all flex items-center space-x-2"
          >
            <span className="text-xl">⬅️</span>
            <span>Back</span>
          </button>
          
          <div className="flex items-center space-x-4">
            <span className="text-xs font-mono text-white/20 uppercase tracking-widest">
              Step {currentStep} of 9
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
