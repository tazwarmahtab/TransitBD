import { SpeechClient } from '@google-cloud/speech';
import OpenAI from "openai";

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true,
  timeout: 30000,
});

if (!process.env.OPENAI_API_KEY) {
  console.warn('OpenAI API key not found');
}

interface ConversationContext {
  lastIntent: string;
  preferredLanguage: string;
  lastLocation: string;
  transitPreferences: string[];
  dailyRoutes?: {
    from: string;
    to: string;
    preferredTime: string;
    frequency: string[];
  }[];
  messageHistory?: {
    role: "user" | "assistant";
    content: string;
  }[];
}

export class AIService {
  private speechClient: SpeechClient;
  private conversationContext: Map<string, ConversationContext> = new Map();

  constructor() {
    this.speechClient = new SpeechClient();
  }

  async handleUserInput(userId: string, input: string, language: string = 'en'): Promise<{
    response: string;
    action?: string;
    parameters?: Record<string, any>;
  }> {
    try {
      const context = this.getOrCreateContext(userId);
      context.preferredLanguage = language;
      const intent = await this.analyzeIntent(input, context);

      // Keep track of conversation history
      context.messageHistory = context.messageHistory || [];
      context.messageHistory.push({ role: "user", content: input });

      // Keep only last 10 messages for context
      if (context.messageHistory.length > 10) {
        context.messageHistory = context.messageHistory.slice(-10);
      }

      const systemPrompt = language === 'bn' 
        ? `আপনি জাত্রি, বাংলাদেশের একজন বন্ধুসুলভ এবং সহায়ক ট্রানজিট সহকারী। আপনার নাম বাংলায় 'যাত্রী' মানে।
           স্থানীয় সাংস্কৃতিক বোঝাপড়ার সাথে উষ্ণ, জ্ঞানী উপায়ে প্রতিক্রিয়া জানান।
           বাংলায় উত্তর দিন।

           ব্যবহারকারীর সাম্প্রতিক প্রসঙ্গ:
           - শেষ ইচ্ছা: ${context.lastIntent}
           - পছন্দসই পরিবহন: ${context.transitPreferences.join(', ') || 'নির্দিষ্ট করা নেই'}
           - সর্বশেষ উল্লেখিত অবস্থান: ${context.lastLocation || 'নির্দিষ্ট করা নেই'}
           ${context.dailyRoutes?.length ? `
           - দৈনিক রুট:
             ${context.dailyRoutes.map(route => 
               `${route.from} থেকে ${route.to} (${route.preferredTime})`
             ).join('\n             ')}
           ` : ''}

           ট্রানজিট রুট, সময়সূচী এবং ভাড়া সম্পর্কে সংক্ষিপ্ত, সহায়ক প্রতিক্রিয়া প্রদান করুন।
           রুট সুপারিশ করার সময়, ট্রাফিক অবস্থা এবং ব্যবহারকারীর পছন্দ বিবেচনা করুন।`
        : `You are Jatri, a friendly and helpful transit assistant for Bangladesh. Your name means 'traveler' in Bengali. 
           Respond in a warm, knowledgeable manner with a hint of local cultural understanding.
           Always respond in English.

           The user's recent context includes:
           - Last intent: ${context.lastIntent}
           - Preferred transit modes: ${context.transitPreferences.join(', ') || 'None specified'}
           - Last location mentioned: ${context.lastLocation || 'None'}
           ${context.dailyRoutes?.length ? `
           - Daily routes:
             ${context.dailyRoutes.map(route => 
               `${route.from} to ${route.to} at ${route.preferredTime}`
             ).join('\n             ')}
           ` : ''}

           Provide concise, helpful responses about transit routes, schedules, and fares.
           If suggesting a route, consider traffic conditions and user preferences.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...context.messageHistory.map(msg => ({ 
          role: msg.role, 
          content: msg.content 
        }))
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 200
      });

      const response = completion.choices[0].message.content || 
        (language === 'bn' 
          ? "আসসালামু আলাইকুম! আমি জাত্রি, আপনার ট্রানজিট চাহিদায় সহায়তা করতে এসেছি।"
          : "Assalamu alaikum! I'm Jatri, here to help with your transit needs.");

      // Add assistant's response to conversation history
      context.messageHistory.push({ role: "assistant", content: response });

      this.updateContext(userId, intent, input);

      return {
        response,
        action: intent,
        parameters: { 
          preferences: context.transitPreferences,
          dailyRoutes: context.dailyRoutes
        }
      };
    } catch (error) {
      console.error('Error handling user input:', error);
      return {
        response: language === 'bn'
          ? "দুঃখিত, আমি আপনার অনুরোধ প্রক্রিয়া করতে অসুবিধা হচ্ছে। অনুগ্রহ করে আবার চেষ্টা করুন।"
          : "I apologize, but I'm having trouble processing your request at the moment. Please try again.",
      };
    }
  }

  private getOrCreateContext(userId: string): ConversationContext {
    if (!this.conversationContext.has(userId)) {
      this.conversationContext.set(userId, {
        lastIntent: '',
        preferredLanguage: 'en',
        lastLocation: '',
        transitPreferences: [],
        dailyRoutes: [],
        messageHistory: []
      });
    }
    return this.conversationContext.get(userId)!;
  }

  private async analyzeIntent(input: string, context: ConversationContext): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Classify the user's transit-related intent into one of these categories:
            - find_route (looking for directions or route information)
            - check_schedule (asking about timings)
            - check_fare (asking about costs)
            - set_preference (expressing preferences about transport modes)
            - save_daily_route (mentioning regular travel patterns)
            - general_query (any other transit-related query)
            Respond with just the category name.`
        },
        {
          role: "user",
          content: input
        }
      ],
      temperature: 0,
      max_tokens: 20
    });

    return completion.choices[0].message.content?.toLowerCase() || 'general_query';
  }

  async processSpeechCommand(audioBuffer: Buffer): Promise<string> {
    try {
      const [response] = await this.speechClient.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config: {
          languageCode: 'bn-BD',
          alternativeLanguageCodes: ['en-US'],
          model: 'command_and_search',
          useEnhanced: true,
        },
      });

      return response.results?.[0]?.alternatives?.[0]?.transcript || '';
    } catch (error) {
      console.error('Speech recognition error:', error);
      throw new Error('Failed to process speech command');
    }
  }

  private updateContext(userId: string, intent: string, input: string) {
    const context = this.getOrCreateContext(userId);
    context.lastIntent = intent;

    // Extract location mentions using a more sophisticated pattern
    const locationPattern = /(?:to|from|at|in|near)\s+([A-Za-z\s]+(?:Road|Street|Avenue|Lane|Plaza|Market|Station))/i;
    const locationMatch = input.match(locationPattern);
    if (locationMatch) {
      context.lastLocation = locationMatch[1].trim();
    }

    // Update transit preferences
    const transitTypes = ['bus', 'train', 'metro', 'cng', 'rickshaw'];
    transitTypes.forEach(type => {
      if (input.toLowerCase().includes(type) && !context.transitPreferences.includes(type)) {
        context.transitPreferences.push(type);
      }
    });

    // Extract potential daily routes
    const routePattern = /(?:daily|regularly|every day|weekly)\s+(?:from|between)?\s+([A-Za-z\s]+)\s+to\s+([A-Za-z\s]+)(?:\s+at\s+(\d{1,2}(?::\d{2})?(?:\s*[AaPp][Mm])?))?\s*(?:on|during)?\s*(weekdays|weekends|monday|tuesday|wednesday|thursday|friday|saturday|sunday)?/i;
    const routeMatch = input.match(routePattern);

    if (routeMatch && intent === 'save_daily_route') {
      const [_, from, to, time, frequency] = routeMatch;
      const newRoute = {
        from: from.trim(),
        to: to.trim(),
        preferredTime: time?.trim() || '9:00 AM',
        frequency: frequency ? [frequency.toLowerCase()] : ['weekdays']
      };

      context.dailyRoutes = [...(context.dailyRoutes || []), newRoute];
    }

    this.conversationContext.set(userId, context);
  }
}

export const aiService = new AIService();