import React, { useState } from 'react';
import { Send, Bot, User, Loader2, X, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { AnimatePresence, motion } from 'motion/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // @ts-ignore
    const currentKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyBSJ7Un1ibEqzz-onaeLcGsUhhKGyDXswI";
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
      
      let contents = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: newMessage.content }] });
      
      // We prepend a system instruction using a starting model message for the actual contents 
      // array since systemInstruction is part of the model configuration, but we can also just use it directly.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
           systemInstruction: 'Eres un asistente útil y amigable para el equipo. Ayudas con redacción, soluciones y preguntas generales.'
        }
      });

      const reply: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', content: response.text || '' };
      setMessages(prev => [...prev, reply]);
    } catch (err: any) {
      console.error("AI Error:", err);
      // Extraemos el mensaje de error para mostrarlo en el alert
      const errorMessage = err?.message || JSON.stringify(err) || 'Error desconocido';
      alert(`Error contactando a la IA: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] max-h-[calc(100vh-120px)] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xl flex flex-col z-50"
          >
            <div className="bg-primary-600 p-4 text-white shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                  <Bot className="w-5 h-5" /> Asistente IA
                </h2>
                <p className="text-primary-200 text-[10px] font-bold mt-0.5">Conectado a Gemini</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-primary-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Bot className="w-12 h-12 mb-3 opacity-50" />
                  <p className="font-bold uppercase tracking-widest text-xs text-center">¿En qué puedo ayudarte?</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                   <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-primary-600 text-white order-2' : 'bg-slate-200 text-slate-600 order-1'}`}>
                     {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                   </div>
                   <div className={`px-3 py-2 rounded-2xl text-sm max-w-[85%] whitespace-pre-wrap ${m.role === 'user' ? 'bg-primary-600 text-white order-1 rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 order-2 rounded-tl-sm'}`}>
                     {m.content}
                   </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                   <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-slate-200 text-slate-600 shrink-0">
                     <Bot className="w-3 h-3" />
                   </div>
                   <div className="px-3 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 rounded-tl-sm flex items-center">
                     <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                   </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={handleSend} className="flex gap-2">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-primary-500 focus:bg-white transition-colors text-sm font-medium"
                />
                <button 
                  type="submit" 
                  disabled={isLoading || !input.trim()}
                  className="bg-primary-600 hover:bg-primary-700 text-white px-3 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-xl shadow-primary-600/30 transition-transform hover:scale-105 z-50"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </>
  );
}
