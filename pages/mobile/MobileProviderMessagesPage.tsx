import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Send, 
  MoreVertical,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { messageService } from '../../services/messageService';
import { supabase } from '../../services/supabaseClient';

interface Conversation {
  id: string;
  name: string;
  role: string;
  lastMsg: string;
  time: string;
  avatar: string;
  unread: number;
  online: boolean;
}

interface Msg {
  id: string;
  sender: 'me' | 'them';
  text: string;
  time: string;
  isPending?: boolean;
  isRead?: boolean;
}

const toTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const MobileProviderMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  
  const userId = currentUser?.id || '';
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<string>('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clientId = searchParams.get('client');

  // Charger les conversations
  useEffect(() => {
    let isMounted = true;
    
    const loadConversations = async () => {
      if (!currentUser) return;
      setLoading(true);
      
      try {
        // Charger les conversations en parallèle avec les profils
        const [previewsResult, profilesResult] = await Promise.all([
          messageService.listConversations(userId),
          supabase.from('profiles').select('id,full_name,avatar_url,role')
        ]);
        
        if (!isMounted) return;
        
        const partnerIds = previewsResult.map(p => p.partnerId).filter(Boolean);
        const profiles = profilesResult.data || [];
        
        const partnersById = new Map<string, any>();
        profiles.forEach((p: any) => partnersById.set(String(p.id), p));

        const convs = previewsResult
          .map(p => {
            const partner = partnersById.get(p.partnerId) || { id: p.partnerId };
            const name = partner?.full_name || partner?.name || 'Client';
            return {
              id: p.partnerId,
              name,
              role: 'Client',
              lastMsg: p.lastMessage?.content || '',
              time: p.lastMessage?.created_at ? toTime(p.lastMessage.created_at) : '',
              avatar: partner?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=E5E7EB&color=111827&rounded=true`,
              unread: p.unreadCount,
              online: true
            };
          })
          .filter(c => c.id);

        setConversations(convs);
        
        // Si clientId dans l'URL, ouvrir cette conversation
        if (clientId) {
          setActiveChat(clientId);
        }
      } catch (error) {
        console.error('Error loading conversations:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConversations();
    
    return () => { isMounted = false; };
  }, [currentUser, userId, clientId]);

  // Charger les messages de la conversation active
  useEffect(() => {
    if (!activeChat || !currentUser) return;

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        const data = await messageService.getConversationMessages(userId, activeChat);
        const mapped = data.map(m => ({
          id: m.id,
          sender: m.sender_id === userId ? 'me' : 'them',
          text: m.content,
          time: toTime(m.created_at),
          isRead: m.read
        }));
        setMessages(mapped);
        
        // Marquer comme lu
        await messageService.markConversationRead(userId, activeChat);
        setConversations(prev => prev.map(c => 
          c.id === activeChat ? { ...c, unread: 0 } : c
        ));
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeChat, currentUser, userId]);

  // Scroll to bottom seulement quand on envoie un nouveau message
  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.sender === 'me') {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeChat) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg: Msg = {
      id: tempId,
      sender: 'me',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isPending: true
    };

    setMessages(prev => [...prev, newMsg]);
    setInput('');

    try {
      await messageService.sendMessage({
        senderId: userId,
        receiverId: activeChat,
        content: input.trim()
      });
      
      // Mettre à jour le message temporaire
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...m, isPending: false } : m
      ));
      
      // Mettre à jour la conversation
      setConversations(prev => prev.map(c => 
        c.id === activeChat 
          ? { ...c, lastMsg: input.trim(), time: newMsg.time }
          : c
      ));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const activeContact = conversations.find(c => c.id === activeChat);

  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Skeleton loader pour les conversations
  const renderSkeleton = () => (
    <div className="divide-y divide-gray-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="w-24 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-10 h-3 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-3/4 h-3 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {!activeChat ? (
        // Liste des conversations
        <>
          <header className="bg-white px-4 py-4 sticky top-0 z-40 safe-area-top border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">Messages</h1>
              <div className="w-10" />
            </div>
            
            {/* Search */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
              />
            </div>
          </header>

          <main className="pb-24">
            {loading ? (
              renderSkeleton()
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500">Aucune conversation</p>
                <p className="text-gray-400 text-sm mt-1">
                  Les messages de vos clients apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredConversations.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat.id)}
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={chat.avatar} 
                        alt={chat.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">{chat.name}</h3>
                        <span className="text-xs text-gray-400">{chat.time}</span>
                      </div>
                      <p className={`text-sm truncate ${chat.unread > 0 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                        {chat.lastMsg || 'Nouvelle conversation'}
                      </p>
                    </div>
                    {chat.unread > 0 && (
                      <div className="w-5 h-5 bg-eveneo-blue text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>

          <MobileBottomNav />
        </>
      ) : (
        // Conversation active
        <div className="h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100 safe-area-top">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveChat('')}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft size={24} className="text-gray-700" />
              </button>
              
              {activeContact && (
                <>
                  <div className="relative">
                    <img 
                      src={activeContact.avatar} 
                      alt={activeContact.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    {activeContact.online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{activeContact.name}</h3>
                    <p className="text-xs text-green-600">
                      {activeContact.online ? 'En ligne' : 'Hors ligne'}
                    </p>
                  </div>
                </>
              )}
            </div>
            
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <MoreVertical size={20} className="text-gray-600" />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {loadingMessages ? (
              // Skeleton loader pour les messages
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-gray-200' : 'bg-gray-100'} rounded-2xl px-4 py-3 animate-pulse`}>
                      <div className="w-32 h-3 bg-gray-300 rounded mb-2" />
                      <div className="w-20 h-2 bg-gray-300 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.sender === 'me' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm ${
                          msg.sender === 'me'
                            ? 'bg-eveneo-blue text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                        } ${msg.isPending ? 'opacity-70' : ''}`}
                      >
                        {msg.text}
                      </div>
                      <div className="flex items-center gap-1 mt-1 px-1">
                        <span className="text-xs text-gray-400">{msg.time}</span>
                        {msg.sender === 'me' && (
                          msg.isPending ? (
                            <Clock size={12} className="text-gray-400" />
                          ) : msg.isRead ? (
                            <CheckCheck size={12} className="text-eveneo-blue" />
                          ) : (
                            <Check size={12} className="text-gray-400" />
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 safe-area-bottom">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Message..."
                className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2.5 bg-eveneo-blue text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
