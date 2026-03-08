import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  AnimatePresence, 
  motion 
} from 'motion/react';
import { generateScripts, ScriptGenerationParams } from '../services/geminiService';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';

const scriptSchema = z.object({
  toolName: z.string().min(2, "Numele este prea scurt"),
  toolUrl: z.string().url("URL invalid"),
  description: z.string().min(100, "Descrierea trebuie să aibă minim 100 de caractere"),
  targetAudience: z.array(z.string()).min(1, "Selectează minim o audiență"),
  duration: z.string(),
  category: z.string(),
  goal: z.string(),
  scriptType: z.enum(['podcast', 'solo', 'voiceover', 'testimonial']),
});

type ScriptFormValues = z.infer<typeof scriptSchema>;

const categories = ['Marketing', 'SEO', 'Auto', 'Real Estate', 'Trading', 'Food', 'Automation', 'Other'];
const goals = ['Awareness', 'Leads', 'Sales', 'Demo Requests'];
const audiences = ['B2B', 'B2C', 'Agencies', 'Freelancers'];

export const CreateContentPage = () => {
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScripts, setGeneratedScripts] = useState<any>(null);
  const [selectedVariation, setSelectedVariation] = useState<'variationA' | 'variationB' | 'variationC'>('variationA');

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ScriptFormValues>({
    resolver: zodResolver(scriptSchema),
    defaultValues: {
      targetAudience: [],
      duration: "180",
      category: "Marketing",
      goal: "Awareness",
      scriptType: "podcast",
    }
  });

  const selectedAudience = watch('targetAudience');

  const onSubmit = async (data: ScriptFormValues) => {
    setIsGenerating(true);
    setStep(3);
    try {
      const result = await generateScripts({
        ...data,
        duration: parseInt(data.duration),
      });
      setGeneratedScripts(result);
      
      // Save to Firestore
      if (user) {
        await addDoc(collection(db, 'content'), {
          userId: user.id,
          toolName: data.toolName,
          toolUrl: data.toolUrl,
          type: 'script',
          status: 'draft',
          variations: result,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error(error);
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleAudience = (val: string) => {
    const current = [...selectedAudience];
    if (current.includes(val)) {
      setValue('targetAudience', current.filter(item => item !== val));
    } else {
      setValue('targetAudience', [...current, val]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Create Content</h1>
        <p className="text-white/40">Generate high-converting scripts for your marketing tools.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2 z-0" />
        {[1, 2, 3].map((s) => (
          <div 
            key={s} 
            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 text-xl ${
              step >= s ? 'bg-accent text-bg-dark electric-glow' : 'bg-surface text-white/40'
            }`}
          >
            {step > s ? '✅' : s}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tool Name</label>
                    <input 
                      {...register('toolName')}
                      placeholder="e.g. WhatsAll Bot"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-all"
                    />
                    {errors.toolName && <p className="text-xs text-alert">{errors.toolName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Tool URL</label>
                    <input 
                      {...register('toolUrl')}
                      placeholder="https://ssocial.eu"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-all"
                    />
                    {errors.toolUrl && <p className="text-xs text-alert">{errors.toolUrl.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/60">Description (Min 100 chars)</label>
                  <textarea 
                    {...register('description')}
                    rows={4}
                    placeholder="Describe what the tool does, key benefits, and why people need it..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-all resize-none"
                  />
                  {errors.description && <p className="text-xs text-alert">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Category</label>
                    <select 
                      {...register('category')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-all appearance-none"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/60">Primary Goal</label>
                    <select 
                      {...register('goal')}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none transition-all appearance-none"
                    >
                      {goals.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="bg-primary text-white px-8 py-4 rounded-xl font-bold flex items-center space-x-2 hover:scale-105 transition-all"
                >
                  <span>Next Step</span>
                  <span className="text-xl">➡️</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="glass-card p-8 space-y-8">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-white/60 flex items-center space-x-2">
                    <span className="text-xl">👥</span>
                    <span>Target Audience</span>
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {audiences.map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAudience(a)}
                        className={`px-6 py-3 rounded-xl border transition-all ${
                          selectedAudience.includes(a) 
                            ? 'bg-accent/10 border-accent text-accent' 
                            : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  {errors.targetAudience && <p className="text-xs text-alert">{errors.targetAudience.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-sm font-medium text-white/60 flex items-center space-x-2">
                      <span className="text-xl">📝</span>
                      <span>Script Type</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { id: 'podcast', label: 'Podcast Interview', desc: 'Alina & Sergiu dialogue' },
                        { id: 'solo', label: 'Solo Presentation', desc: 'Sergiu direct to camera' },
                        { id: 'voiceover', label: 'Voiceover Demo', desc: 'Narrated walkthrough' },
                        { id: 'testimonial', label: 'Customer Testimonial', desc: 'Interview style' },
                      ].map(type => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setValue('scriptType', type.id as any)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            watch('scriptType') === type.id 
                              ? 'bg-primary/10 border-primary text-primary' 
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <p className="font-bold">{type.label}</p>
                          <p className="text-xs opacity-60">{type.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-medium text-white/60 flex items-center space-x-2">
                      <span className="text-xl">⏱️</span>
                      <span>Target Duration</span>
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { val: '60', label: '60 Seconds', desc: 'Best for TikTok/Reels' },
                        { val: '180', label: '180 Seconds', desc: 'Best for YouTube/LinkedIn' },
                        { val: '300', label: '300 Seconds', desc: 'Deep dive presentation' },
                      ].map(dur => (
                        <button
                          key={dur.val}
                          type="button"
                          onClick={() => setValue('duration', dur.val)}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            watch('duration') === dur.val 
                              ? 'bg-success/10 border-success text-success' 
                              : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                          }`}
                        >
                          <p className="font-bold">{dur.label}</p>
                          <p className="text-xs opacity-60">{dur.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-white/60 px-8 py-4 rounded-xl font-bold flex items-center space-x-2 hover:text-white transition-all"
                >
                  <span className="text-xl">⬅️</span>
                  <span>Back</span>
                </button>
                <button 
                  type="submit"
                  className="bg-accent text-bg-dark px-10 py-4 rounded-xl font-bold flex items-center space-x-2 electric-glow hover:scale-105 transition-all"
                >
                  <span className="text-xl">🪄</span>
                  <span>Generate Complete Package</span>
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              {isGenerating ? (
                <div className="glass-card p-20 flex flex-col items-center justify-center space-y-8">
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-accent/20 rounded-full" />
                      <div className="absolute top-0 left-0 w-24 h-24 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-accent animate-pulse text-2xl">✨</span>
                    </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">Gemini is Crafting Your Scripts...</h3>
                    <p className="text-white/40">Analyzing your tool and creating high-converting dialogue.</p>
                  </div>
                  <div className="w-full max-w-xs bg-white/5 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent"
                      animate={{ width: ['0%', '100%'] }}
                      transition={{ duration: 10, repeat: Infinity }}
                    />
                  </div>
                </div>
              ) : generatedScripts && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      {(['variationA', 'variationB', 'variationC'] as const).map(v => (
                        <button
                          key={v}
                          onClick={() => setSelectedVariation(v)}
                          className={`px-6 py-3 rounded-xl font-bold transition-all ${
                            selectedVariation === v 
                              ? 'bg-accent text-bg-dark' 
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {v === 'variationA' ? 'Direct' : v === 'variationB' ? 'Story' : 'Hook'}
                        </button>
                      ))}
                    </div>
                    <div className="flex space-x-3">
                      <button className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white transition-all">
                        <span className="text-xl">📋</span>
                      </button>
                      <button className="p-3 bg-white/5 rounded-xl text-white/60 hover:text-white transition-all">
                        <span className="text-xl">💾</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="glass-card p-8 min-h-[500px] font-mono text-sm leading-relaxed whitespace-pre-wrap">
                        {generatedScripts[selectedVariation].content}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="glass-card p-6 space-y-4">
                        <h4 className="font-bold flex items-center space-x-2">
                          <span className="text-xl">🎯</span>
                          <span>Script Intelligence</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/40">Estimated Duration:</span>
                            <span className="font-medium">{generatedScripts[selectedVariation].estimatedDuration}s</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/40">Recommendation:</span>
                            <span className="font-medium text-accent">{generatedScripts[selectedVariation].platformRecommendation}</span>
                          </div>
                        </div>
                      </div>

                      <div className="glass-card p-6 space-y-4">
                        <h4 className="font-bold flex items-center space-x-2">
                          <span className="text-xl">📜</span>
                          <span>Quality Checklist</span>
                        </h4>
                        <div className="space-y-2">
                          {[
                            'Format correct (Speaker: text)',
                            'Numbers in words',
                            'Pause markers included',
                            'Client story included',
                            'Clear CTA at end'
                          ].map((item, i) => (
                            <div key={i} className="flex items-center space-x-3 text-xs text-white/60">
                              <span className="text-success">✅</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <button 
                        onClick={() => setStep(1)}
                        className="w-full py-4 border border-white/10 rounded-xl font-bold hover:bg-white/5 transition-all"
                      >
                        Create Another
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};
