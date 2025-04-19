"use client";

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { MessageCircle, Send, X, Loader2, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { useClickOutside } from '@/app/hooks/useClickOutside';
import { usePdfContext } from '@/app/providers/PdfContext';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export default function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const { pdfContent } = usePdfContext();
  const [hasReportContext, setHasReportContext] = useState(false);

  useEffect(() => {
    setHasReportContext(pdfContent.length > 0);
  }, [pdfContent]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const initialMessage = pdfContent 
        ? 'Hello! I can help you with questions about your property valuation report and HDB information. What would you like to know?'
        : 'Hello! How can I help you with **HDB** information today?';
      
      const suggestions = pdfContent
        ? ['Explain my valuation', 'Summarize property features', 'What affects my property value?']
        : ['Tell me about HDB', 'What are BTO flats?', 'HDB resale prices'];
      
      setMessages([
        { 
          role: 'assistant', 
          content: initialMessage,
          suggestions: suggestions 
        }
      ]);
    }
  }, [isOpen, messages.length, pdfContent]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useClickOutside(chatRef, () => setIsOpen(false), isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          pdfContent: pdfContent || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      let assistantMessage = '';

      if (reader) {
        setMessages(prev => [...prev, { role: 'assistant', content: '', suggestions: [] }]);
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = new TextDecoder().decode(value);
          assistantMessage += text;
          
          setMessages(prev => [
            ...prev.slice(0, -1),
            { 
              role: 'assistant', 
              content: assistantMessage,
              suggestions: [] // Empty initially
            }
          ]);
        }
        
        // After receiving the full message, generate follow-up questions
        const suggestionsResponse = await fetch('/api/suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: assistantMessage,
            pdfContent: pdfContent || null
          }),
        });
        
        if (suggestionsResponse.ok) {
          const { suggestions } = await suggestionsResponse.json();
          
          setMessages(prev => [
            ...prev.slice(0, -1),
            {
              ...prev[prev.length - 1],
              suggestions: suggestions || []
            }
          ]);
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Something went wrong. Please try again.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSubmit({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end" ref={chatRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="mb-4"
          >
            <Card className="w-[350px] h-[500px] flex flex-col bg-white dark:bg-gray-900 dark:border-gray-800">
              <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Chat Assistant</h3>
                  {hasReportContext && (
                    <Badge variant="outline" className="flex items-center gap-1 text-xs py-0">
                      <File className="h-3 w-3" />
                      Personalized
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`rounded-lg px-4 py-2 max-w-[80%] overflow-hidden ${
                          message.role === 'user'
                            ? 'bg-primary'
                            : 'bg-muted'
                        }`}
                      >
                        <div className={`prose prose-sm dark:prose-invert max-w-none ${message.role === 'user' ? 'user-message-text' : 'assistant-message-text'}`}>
                          <ReactMarkdown className="text-sm leading-normal">{message.content}</ReactMarkdown>
                        </div>
                        
                        {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                          <div className="mt-2 flex flex-col gap-2">
                            {message.suggestions.map((suggestion, i) => (
                              <Button 
                                key={i} 
                                variant="outline" 
                                size="sm" 
                                className="text-xs justify-start h-auto py-1.5 text-left"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="rounded-lg px-4 py-2 bg-muted">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <form onSubmit={handleSubmit} className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isLoading} className="bg-white dark:bg-gray-800 text-primary hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        size="icon"
        className={`h-12 w-12 rounded-full shadow-lg bg-white dark:bg-gray-800 text-primary hover:bg-gray-100 dark:hover:bg-gray-700
          ${hasReportContext ? 'border-2 border-primary' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    </div>
  );
}
