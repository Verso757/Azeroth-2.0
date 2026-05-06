import React, { useState } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const currentKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!currentKey) {
      alert("Por favor configura la variable de entorno VITE_GEMINI_API_KEY.");
      return;
    }

    const newMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: currentKey });
      
      const chat = ai.chats.create({
        model: 'gemini-3.1-pro-preview',
        config: {
          systemInstruction: 'Eres un asistente útil y amigable para el equipo. Ayudas con redacción, soluciones y preguntas generales.',
        }
      });

      // Simple implementation just to pass past messages (The new SDK handles history differently if persisted, but we'll just send the text prompt directly to a new generation for simplicity if history is too complex or we can construct history manually.
      // Actually ai.chats.create creates a stateful chat but since we instantiate it here, it will only have the current history.
      // Better way: use generateContent and pass text.
      
      let contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: newMessage.content }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents,
      });

      const reply: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: response.text || '' };
      setMessages(prev => [...prev, reply]);
    } catch (err) {
      console.error(err);
      alert('Error contactando a la IA');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-primary-600 p-6 text-white shrink-0">
        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
          <Bot className="w-6 h-6" /> Chat General (Asistente IA)
        </h2>
        <p className="text-primary-200 text-sm font-medium mt-1">Conectado a Gemini. Haz tus preguntas aquí.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Bot className="w-16 h-16 mb-4 opacity-50" />
            <p className="font-bold uppercase tracking-widest text-sm">¿En qué puedo ayudarte hoy?</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
             <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary-600 text-white order-2' : 'bg-slate-200 text-slate-600 order-1'}`}>
               {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
             </div>
             <div className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary-600 text-white order-1 rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 order-2 rounded-tl-sm'}`}>
               {m.content}
             </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
             <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-200 text-slate-600 shrink-0">
               <Bot className="w-4 h-4" />
             </div>
             <div className="px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 rounded-tl-sm flex items-center">
               <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
             </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 outline-none focus:border-primary-500 focus:bg-white transition-colors text-sm font-medium"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 rounded-2xl flex items-center justify-center disabled:opacity-50 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
