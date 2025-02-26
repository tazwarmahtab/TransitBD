import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import { useTranslation } from "@/lib/i18n";
import { Mic, MicOff, Loader2, X, Send } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { Card } from "./card";
import { Input } from "./input";
import { motion, AnimatePresence } from "framer-motion";
import { FluidSphere } from "./fluid-sphere";
import { ScrollArea } from "./scroll-area";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

export function FloatingAssistant() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { 
    isListening, 
    isProcessing, 
    lastResponse, 
    startListening, 
    stopListening 
  } = useVoiceAssistant();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [{
    id: "welcome",
    content: t('ai_assistant.welcome'),
    role: "assistant",
    timestamp: new Date()
  }]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const scrollToBottom = useCallback(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, []);

  // Handle new responses from voice assistant
  useEffect(() => {
    if (lastResponse && messages[messages.length - 1]?.content !== lastResponse) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: lastResponse,
        role: "assistant",
        timestamp: new Date(),
      }]);

      // Announce new message to screen readers
      toast({
        title: t('ai_assistant.new_message'),
        description: lastResponse,
        duration: 3000,
      });
    }
  }, [lastResponse, messages, t, toast]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Text-to-speech support
  const handleSpeak = async (text: string) => {
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = i18n.language === 'bn' ? 'bn-BD' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: "user",
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept-Language": i18n.language
        },
        body: JSON.stringify({ 
          message: input.trim(),
          language: i18n.language
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant" as const,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Automatically speak the response
      handleSpeak(data.response);

      toast({
        title: t('ai_assistant.response_received'),
        description: data.response,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage = {
        id: Date.now().toString(),
        content: t('ai_assistant.error_message'),
        role: "assistant" as const,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);

      toast({
        title: t('ai_assistant.error'),
        description: t('ai_assistant.error_message'),
        variant: "destructive",
      });
    } finally {
      setIsThinking(false);
    }
  }, [input, t, i18n.language, toast]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const messageElements = useMemo(() => (
    messages.map((message) => (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-start gap-3 py-4 first:pt-0 last:pb-0",
          message.role === "user" ? "flex-row-reverse" : "flex-row",
          message.role === "assistant" && "bg-muted/50"
        )}
        role="log"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={cn(
          "flex-1 px-4",
          message.role === "user" && "text-right"
        )}>
          <p className="text-sm text-foreground/80">
            <span className="sr-only">
              {message.role === "user" ? t('ai_assistant.you') : t('ai_assistant.assistant')}:
            </span>
            {message.content}
          </p>
        </div>
      </motion.div>
    ))
  ), [messages, t]);

  return (
    <div 
      className="fixed bottom-4 right-4 z-50"
      role="complementary"
      aria-label={t('ai_assistant.title')}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            initial={{ scale: 0, borderRadius: "9999px", width: "3rem", height: "3rem" }}
            animate={{ 
              scale: 1,
              borderRadius: "0.75rem",
              width: "90vw", 
              height: "auto",
              transition: {
                type: "spring",
                damping: 25,
                stiffness: 120,
                duration: 0.5
              }
            }}
            exit={{ 
              scale: 0,
              borderRadius: "9999px",
              width: "3rem",
              height: "3rem",
              transition: {
                duration: 0.3
              }
            }}
            className="fixed bottom-4 right-4 md:right-8 origin-bottom-right"
            style={{ maxWidth: "600px" }}
          >
            <Card 
              className="w-full shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
              role="dialog"
              aria-modal="true"
              aria-labelledby="chat-title"
            >
              <motion.div 
                className="p-4 border-b flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div>
                  <h3 id="chat-title" className="font-semibold">{t('ai_assistant.title')}</h3>
                  <p className="text-sm text-muted-foreground">{t('ai_assistant.subtitle')}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="hover:rotate-90 transition-transform duration-200"
                  aria-label={t('ai_assistant.close')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>

              <ScrollArea 
                className="h-[60vh] px-4"
                role="log"
                aria-label={t('ai_assistant.chat_history')}
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <AnimatePresence mode="popLayout">
                    {messageElements}
                    {isThinking && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-muted-foreground p-4"
                        role="status"
                        aria-live="polite"
                      >
                        <FluidSphere 
                          isActive
                          isAnimating
                          isSpeaking={false}
                          className="w-6 h-6"
                        />
                        <span className="text-sm">{t('ai_assistant.thinking')}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </ScrollArea>

              <motion.div 
                className="p-4 border-t bg-background/95"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                role="form"
                aria-label={t('ai_assistant.message_form')}
              >
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isProcessing || isThinking}
                    onClick={() => {
                      if (isListening) {
                        stopListening();
                      } else {
                        startListening();
                      }
                    }}
                    className={cn(
                      "transition-all duration-200",
                      isListening && "bg-primary text-primary-foreground animate-pulse"
                    )}
                    aria-label={isListening ? t('ai_assistant.stop_listening') : t('ai_assistant.start_listening')}
                    aria-pressed={isListening}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : isListening ? (
                      <Mic className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <MicOff className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t('ai_assistant.type_message')}
                    onKeyPress={handleKeyPress}
                    className="transition-all duration-200 focus:ring-2 focus:ring-primary"
                    disabled={isThinking || isProcessing}
                    aria-label={t('ai_assistant.message_input')}
                  />
                  <Button 
                    onClick={handleSend}
                    disabled={isThinking || isProcessing || !input.trim()}
                    className="transition-transform hover:scale-105"
                    aria-label={t('ai_assistant.send')}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Button
              size="lg"
              className="rounded-full shadow-lg hover:shadow-xl transition-shadow duration-200 p-0"
              onClick={() => setIsOpen(prev => !prev)}
              aria-label={isOpen ? t('ai_assistant.hide_chat') : t('ai_assistant.show_chat')}
              aria-expanded={isOpen}
              aria-controls="chat-dialog"
            >
              <FluidSphere 
                isActive={!isOpen} 
                isAnimating={isThinking}
                isSpeaking={isSpeaking}
              />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}