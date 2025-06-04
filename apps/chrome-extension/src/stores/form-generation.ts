import { create } from 'zustand';

interface FormGenerationState {
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const useFormGeneration = create<FormGenerationState>((set) => ({
  isGenerating: false,
  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
