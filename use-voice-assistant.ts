import { useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { apiRequest } from '@/lib/queryClient';
import { processVoiceCommand, getTransitSuggestions } from '@/lib/openai-service';

export function useVoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [lastResponse, setLastResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();

  const startListening = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setLastResponse(t('voice_assistant.browser_not_supported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true 
      });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

        try {
          setIsProcessing(true);

          // Process voice command using OpenAI Whisper
          const { text, language } = await processVoiceCommand(audioBlob);

          // Get navigation suggestions based on the transcribed text
          const suggestions = await getTransitSuggestions(
            text,
            { lat: 23.8103, lng: 90.4125 }, // Current location (Dhaka)
            { preferredLanguage: language }
          );

          // Format response in the detected language
          const response = language === 'bn' 
            ? `আপনার জন্য সবচেয়ে ভালো রুট: ${suggestions[0].route}`
            : `Best route for you: ${suggestions[0].route}`;

          setLastResponse(response);
        } catch (error) {
          console.error('Voice processing error:', error);
          setLastResponse(t('voice_assistant.error'));
        } finally {
          setIsProcessing(false);
          setIsListening(false);
        }
      };

      setIsListening(true);
      mediaRecorder.start();

      // Stop recording after 5 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }
      }, 5000);
    } catch (error) {
      console.error('Voice assistant error:', error);
      setLastResponse(t('voice_assistant.mic_error'));
    }
  }, [t]);

  const stopListening = useCallback(() => {
    setIsListening(false);
  }, []);

  return { 
    isListening, 
    isProcessing,
    lastResponse, 
    startListening,
    stopListening 
  };
}