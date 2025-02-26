import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

interface TutorialStep {
  id: string;
  target: string;
  title: string;
  titleBn: string;
  content: string;
  contentBn: string;
  voicePrompt?: string;
  voicePromptBn?: string;
  placement?: "top" | "bottom" | "left" | "right";
  nextPath?: string;
}

interface TutorialContextType {
  currentStep: TutorialStep | null;
  isActive: boolean;
  startTutorial: () => void;
  endTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  language: "en" | "bn";
  setLanguage: (lang: "en" | "bn") => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    target: "[data-tutorial='map']",
    title: "Welcome to TransitBD!",
    titleBn: "TransitBD তে স্বাগতম!",
    content: "Let's take a quick tour of the app. Click 'Next' to continue.",
    contentBn: "চলুন অ্যাপটির একটি দ্রুত ঘুরে আসি। পরবর্তী ধাপে যেতে 'পরবর্তী' ক্লিক করুন।",
    voicePrompt: "Hello! I am your TransitBD guide. Would you like me to show you around?",
    voicePromptBn: "হ্যালো! আমি আপনার TransitBD গাইড। আমি কি আপনাকে চারপাশে ঘুরিয়ে দেখাবো?",
    placement: "bottom"
  },
  {
    id: "search",
    target: "[data-tutorial='search']",
    title: "Find Your Route",
    titleBn: "আপনার রুট খুঁজুন",
    content: "Search for your destination here to find the best transit options.",
    contentBn: "সর্বোত্তম পরিবহন বিকল্পগুলি খুঁজে পেতে এখানে আপনার গন্তব্য অনুসন্ধান করুন।",
    voicePrompt: "Where would you like to go today? Just type or speak your destination.",
    voicePromptBn: "আজ আপনি কোথায় যেতে চান? আপনার গন্তব্য টাইপ করুন বা বলুন।",
    placement: "bottom"
  },
  {
    id: "ai-assistant",
    target: "[data-tutorial='ai-assistant']",
    title: "Meet Jatri - Your AI Assistant",
    titleBn: "জাত্রী - আপনার AI সহকারীর সাথে পরিচিত হোন",
    content: "Need help? Click here to chat with Jatri, your bilingual AI assistant. You can type or use voice commands!",
    contentBn: "সাহায্য প্রয়োজন? জাত্রীর সাথে চ্যাট করতে এখানে ক্লিক করুন, আপনার দ্বিভাষিক AI সহকারী। আপনি টাইপ করতে পারেন বা ভয়েস কমান্ড ব্যবহার করতে পারেন!",
    voicePrompt: "Hi, I'm Jatri! I can help you in both English and Bangla. Try asking me something!",
    voicePromptBn: "হাই, আমি জাত্রী! আমি আপনাকে ইংরেজি এবং বাংলা উভয় ভাষাতেই সাহায্য করতে পারি। আমাকে কিছু জিজ্ঞাসা করে দেখুন!",
    placement: "left"
  },
  {
    id: "transit-card",
    target: "[data-tutorial='transit-card']",
    title: "Your Transit Card",
    titleBn: "আপনার ট্রানজিট কার্ড",
    content: "View your transit card balance and transaction history here.",
    contentBn: "এখানে আপনার ট্রানজিট কার্ড ব্যালেন্স এবং লেনদেনের ইতিহাস দেখুন।",
    voicePrompt: "Let me show you how to manage your transit card and check your balance.",
    voicePromptBn: "আমি আপনাকে কিভাবে আপনার ট্রানজিট কার্ড পরিচালনা করতে হয় এবং ব্যালেন্স চেক করতে হয় তা দেখাই।",
    placement: "bottom",
    nextPath: "/transit-card"
  }
];

const TutorialContext = createContext<TutorialContextType | null>(null);

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem("tutorialCompleted");
    const savedLanguage = localStorage.getItem("preferredLanguage") as "en" | "bn";

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    if (!hasSeenTutorial) {
      startTutorial();
    }
  }, []);

  const startTutorial = () => {
    setIsActive(true);
    setCurrentStepIndex(0);
  };

  const endTutorial = () => {
    setIsActive(false);
    setCurrentStepIndex(-1);
    localStorage.setItem("tutorialCompleted", "true");
  };

  const skipTutorial = () => {
    endTutorial();
  };

  const nextStep = () => {
    if (currentStepIndex < tutorialSteps.length - 1) {
      const nextStep = tutorialSteps[currentStepIndex + 1];
      if (nextStep.nextPath) {
        setLocation(nextStep.nextPath);
      }
      setCurrentStepIndex(prev => prev + 1);
    } else {
      endTutorial();
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        currentStep: currentStepIndex >= 0 ? tutorialSteps[currentStepIndex] : null,
        isActive,
        startTutorial,
        endTutorial,
        nextStep,
        skipTutorial,
        language,
        setLanguage
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}