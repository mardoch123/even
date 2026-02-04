
import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, MoreVertical, Phone, Video, ArrowLeft, Paperclip, Mic, Camera, AlertTriangle, FileText, X, ShoppingBag, Check, Plus, Edit2, Trash2, Ban, Flag, WifiOff } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useConnectivity } from '../contexts/ConnectivityContext';
import { UserRole } from '../types';
import { moderationService } from '../services/moderationService';
import { chatSafetyService, NEUTRAL_MASK_MESSAGE } from '../services/chatSafetyService';

type Conversation = {
  id: string;
  name: string;
  role: string;
  lastMsg: string;
  time: string;
  avatar: string;
  unread: number;
  online: boolean;
};

interface Msg {
    id: string;
    sender: 'me' | 'them';
    text?: string;
    type: 'text' | 'offer' | 'file' | 'link' | 'audio';
    time: string;
    isPending?: boolean;
    offerDetails?: {
        title: string;
        price: string;
        description: string;
        status: 'pending' | 'accepted';
    };
    fileUrl?: string;
    linkData?: {
        url: string;
        title: string;
        image: string;
    }
}

type StoredChatState = {
  conversations: Conversation[];
  messagesByConversationId: Record<string, Msg[]>;
};

const getStorageKey = (userId: string) => `eveneo_messages_v1:${userId}`;

const buildDefaultState = (): StoredChatState => {
  const c1: Conversation = { id: 'c-1', name: 'Saveurs Exquises', role: 'Traiteur', lastMsg: 'Bonjour !', time: '10:00', avatar: 'https://picsum.photos/50/50?random=1', unread: 0, online: true };
  const c2: Conversation = { id: 'c-2', name: 'DJ Snake Event', role: 'DJ', lastMsg: 'Salut !', time: '09:00', avatar: 'https://picsum.photos/50/50?random=2', unread: 0, online: false };
  return {
    conversations: [c1, c2],
    messagesByConversationId: {
      [c1.id]: [{ id: 'm-101', sender: 'them', type: 'text', text: 'Bonjour, nous sommes ravis de discuter de votre menu !', time: '10:00' }],
      [c2.id]: [{ id: 'm-201', sender: 'them', type: 'text', text: 'Salut, quel style de musique préférez-vous ?', time: '09:00' }]
    }
  };
};

const readState = (userId: string): StoredChatState => {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return buildDefaultState();
    const parsed = JSON.parse(raw) as StoredChatState;
    if (!parsed || !Array.isArray(parsed.conversations) || typeof parsed.messagesByConversationId !== 'object') {
      return buildDefaultState();
    }
    return parsed;
  } catch {
    return buildDefaultState();
  }
};

const writeState = (userId: string, state: StoredChatState) => {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
  } catch {
    // ignore
  }
};

export const MessagesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { isOnline, queueAction } = useConnectivity();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const providerId = searchParams.get('provider');
  
  const userId = currentUser?.id || 'guest';
  const [conversations, setConversations] = useState<Conversation[]>(() => readState(userId).conversations);
  const [allMessages, setAllMessages] = useState<Record<string, Msg[]>>(() => readState(userId).messagesByConversationId);
  const [activeChat, setActiveChat] = useState<string>(() => {
    const initial = readState(userId);
    return initial.conversations[0]?.id || 'c-1';
  });
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState({ title: '', price: '', desc: '' });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeContact = conversations.find(c => c.id === activeChat);
  const messages = allMessages[activeChat] || [];

  useEffect(() => {
    // Reload from storage when user changes
    const state = readState(userId);
    setConversations(state.conversations);
    setAllMessages(state.messagesByConversationId);
    setActiveChat(state.conversations[0]?.id || 'c-1');
  }, [userId]);

  useEffect(() => {
    // If /messages?provider=<id> is used, open or create a dedicated conversation for that provider
    if (!providerId) return;
    const targetConvId = `p:${providerId}`;
    const exists = conversations.some(c => c.id === targetConvId);
    if (!exists) {
      const newConv: Conversation = {
        id: targetConvId,
        name: `Prestataire ${providerId}`,
        role: 'Prestataire',
        lastMsg: '',
        time: '',
        avatar: `https://picsum.photos/50/50?random=${encodeURIComponent(providerId)}`,
        unread: 0,
        online: true
      };
      const nextConvs = [newConv, ...conversations];
      const nextAll = { ...allMessages, [newConv.id]: [] };
      setConversations(nextConvs);
      setAllMessages(nextAll);
      writeState(userId, { conversations: nextConvs, messagesByConversationId: nextAll });
    }
    setActiveChat(targetConvId);
    setMobileView('chat');
  }, [providerId, conversations, allMessages, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChat, mobileView]);

  const handleConversationClick = (id: string) => {
      setActiveChat(id);
      setMobileView('chat');
  };

  const handleBackToList = () => {
      setMobileView('list');
  };

  const handleSend = async (type: 'text' | 'offer' = 'text', content?: any, textOverride?: string) => {
    const rawText = (textOverride ?? input) || '';

    if (type === 'text') {
        if (!rawText.trim()) return;
        const check = moderationService.checkContent(rawText);
        if (!check.valid) {
            alert("Votre message contient des termes offensants. Veuillez le modifier.");
            return;
        }

        const decision = await chatSafetyService.moderateText(rawText);
        if (decision.action === 'block') {
            alert(NEUTRAL_MASK_MESSAGE);
            setInput('');
            return;
        }

        const safe = decision.action === 'allow' ? rawText : decision.safeText;
        const isLink = safe.startsWith('http');

        const newMsg: Msg = {
            id: `m-${Date.now()}`,
            sender: 'me',
            type: isLink ? 'link' : type,
            text: safe,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isPending: !isOnline,
            offerDetails: undefined,
            linkData: isLink ? { url: safe, title: 'Aperçu du lien...', image: 'https://picsum.photos/200/100' } : undefined
        };

        const payload = { chatId: activeChat, message: newMsg };

        queueAction('SEND_MESSAGE', payload, () => {
            setAllMessages(prev => {
                const next = {
                    ...prev,
                    [activeChat]: [...(prev[activeChat] || []), newMsg]
                };
                const nowStr = newMsg.time;
                setConversations(prevConvs => {
                    const nextConvs = prevConvs.map(c => c.id === activeChat ? { ...c, lastMsg: safe, time: nowStr, unread: 0 } : c);
                    writeState(userId, { conversations: nextConvs, messagesByConversationId: next });
                    return nextConvs;
                });
                return next;
            });
        });

        setInput('');
        return;
    }

    const isLink = rawText.startsWith('http');

    const newMsg: Msg = {
        id: `m-${Date.now()}`,
        sender: 'me',
        type: isLink ? 'link' : type,
        text: rawText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isPending: !isOnline,
        offerDetails: type === 'offer' ? content : undefined,
        linkData: isLink ? { url: rawText, title: 'Aperçu du lien...', image: 'https://picsum.photos/200/100' } : undefined
    };

    const payload = { chatId: activeChat, message: newMsg };

    queueAction('SEND_MESSAGE', payload, () => {
        setAllMessages(prev => {
            const next = {
                ...prev,
                [activeChat]: [...(prev[activeChat] || []), newMsg]
            };
            const nowStr = newMsg.time;
            setConversations(prevConvs => {
                const nextConvs = prevConvs.map(c => c.id === activeChat ? { ...c, lastMsg: rawText, time: nowStr, unread: 0 } : c);
                writeState(userId, { conversations: nextConvs, messagesByConversationId: next });
                return nextConvs;
            });
            return next;
        });
    });

    setInput('');
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      e.target.value = '';

      const reader = new FileReader();
      reader.onloadend = async () => {
          const dataUrl = String(reader.result || '');
          if (!dataUrl) return;

          const decision = await chatSafetyService.moderateImage(dataUrl);
          if (decision.action === 'block') {
              await handleSend('text', undefined, NEUTRAL_MASK_MESSAGE);
              return;
          }

          const newMsg: Msg = {
              id: `m-${Date.now()}`,
              sender: 'me',
              type: 'file',
              fileUrl: dataUrl,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isPending: !isOnline
          };

          const payload = { chatId: activeChat, message: newMsg };
          queueAction('SEND_MESSAGE', payload, () => {
              setAllMessages(prev => {
                  const next = {
                      ...prev,
                      [activeChat]: [...(prev[activeChat] || []), newMsg]
                  };
                  setConversations(prevConvs => {
                      const nextConvs = prevConvs.map(c => c.id === activeChat ? { ...c, lastMsg: '📎 Pièce jointe', time: newMsg.time, unread: 0 } : c);
                      writeState(userId, { conversations: nextConvs, messagesByConversationId: next });
                      return nextConvs;
                  });
                  return next;
              });
          });
      };
      reader.readAsDataURL(file);
  };

  // ... Offer handling code remains similar ...
  const handleCreateOrUpdateOffer = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingOfferId) {
          setAllMessages(prev => ({
              ...prev,
              [activeChat]: prev[activeChat].map(m => {
                if (m.id === editingOfferId) {
                    return {
                        ...m,
                        offerDetails: {
                            ...m.offerDetails!,
                            title: offerForm.title,
                            price: offerForm.price + '€',
                            description: offerForm.desc
                        }
                    };
                }
                return m;
              })
          }));
          alert("Offre modifiée avec succès.");
      } else {
          handleSend('offer', { title: offerForm.title, price: offerForm.price + '€', description: offerForm.desc, status: 'pending' });
      }
      setShowOfferModal(false);
      setEditingOfferId(null);
      setOfferForm({ title: '', price: '', desc: '' });
  };

  const handleEditOffer = (msg: Msg) => {
      if (msg.offerDetails?.status === 'accepted') {
          alert("Impossible de modifier une offre déjà acceptée.");
          return;
      }
      setEditingOfferId(msg.id);
      setOfferForm({
          title: msg.offerDetails?.title || '',
          price: msg.offerDetails?.price.replace('€', '') || '',
          desc: msg.offerDetails?.description || ''
      });
      setShowOfferModal(true);
  };

  const initiateAcceptOffer = (id: string) => {
      if (currentUser?.role === UserRole.PROVIDER) {
          alert("En tant que prestataire, vous pouvez modifier l'offre tant qu'elle n'est pas acceptée.");
          return;
      }
      const offer = messages.find(m => m.id === id)?.offerDetails;
      if (!offer?.price) return;
      const amount = parseFloat(String(offer.price).replace('€', '').trim()) || 0;
      navigate(`/payment/stripe?amount=${amount}&type=service_booking`);
  };

  const handleStartCall = (video: boolean = true) => {
      if (!isOnline) {
          alert("Les appels nécessitent une connexion internet active.");
          return;
      }
      setIsCalling(true);
      const roomName = `eveneo-call-${activeChat}-${Date.now()}`;
      const url = `https://meet.jit.si/${roomName}`;
      const callMsg = `📞 J'ai lancé un appel ${video ? 'vidéo' : 'audio'}. Rejoignez-moi ici : ${url}`;
      const newMsg: Msg = { id: `m-${Date.now()}`, sender: 'me', type: 'text', text: callMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      setAllMessages(prev => {
          const next = { ...prev, [activeChat]: [...(prev[activeChat] || []), newMsg] };
          setConversations(prevConvs => {
              const nextConvs = prevConvs.map(c => c.id === activeChat ? { ...c, lastMsg: '📞 Appel', time: newMsg.time, unread: 0 } : c);
              writeState(userId, { conversations: nextConvs, messagesByConversationId: next });
              return nextConvs;
          });
          return next;
      });
      setTimeout(() => { window.open(url, '_blank'); setIsCalling(false); }, 1500);
  };

  return (
    <div className="h-[100dvh] bg-gray-50 pt-20 md:pt-24 pb-0 md:pb-4 px-0 md:px-6 flex flex-col">
        <div className={`max-w-7xl w-full mx-auto mb-2 flex justify-between items-center px-4 md:px-0 ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
            <Link to={currentUser?.role === UserRole.PROVIDER ? "/dashboard/provider" : "/dashboard/client"}>
                <Button variant="ghost" size="sm" className="text-gray-500 hover:text-eveneo-dark pl-0">
                    <ArrowLeft size={18} className="mr-1" /> Retour au tableau de bord
                </Button>
            </Link>
            {!isOnline && (
                <div className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                    <WifiOff size={12} /> Hors ligne - Envoi différé
                </div>
            )}
        </div>

      <div className="max-w-7xl w-full mx-auto bg-white md:rounded-2xl shadow-xl overflow-hidden flex border-t md:border border-gray-200 flex-grow">
        
        {/* Sidebar (List) */}
        <div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-eveneo-dark">Messages</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20" />
            </div>
          </div>

          <div className="flex-grow overflow-y-auto">
            {conversations.map(chat => (
              <div 
                key={chat.id}
                onClick={() => handleConversationClick(chat.id)}
                className={`p-4 flex gap-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                  activeChat === chat.id ? 'bg-blue-50/50 border-l-4 border-eveneo-blue' : 'border-l-4 border-transparent'
                }`}
              >
                <div className="relative">
                  <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                  {/* Online Indicator */}
                  {chat.online && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full">
                          <span className="absolute top-0 right-0 w-full h-full bg-green-500 rounded-full animate-ping opacity-75"></span>
                      </div>
                  )}
                  {chat.unread > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-eveneo-pink text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {chat.unread}
                    </div>
                  )}
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{chat.time}</span>
                  </div>
                  <p className={`text-sm truncate ${chat.unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                    {chat.lastMsg}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`w-full md:w-2/3 flex-col bg-white relative ${mobileView === 'list' ? 'hidden md:flex' : 'flex'}`}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} />
                  </button>
                  
                  <div className="relative">
                      <img src={activeContact.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                      {activeContact.online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
                  </div>
                  
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{activeContact.name}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-eveneo-violet bg-eveneo-violet/10 px-2 py-0.5 rounded-full font-medium">
                        {activeContact.role}
                        </span>
                        {activeContact.online ? (
                            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> En ligne
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400">Hors ligne</span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 md:gap-2 text-gray-400 relative">
                  <button onClick={() => handleStartCall(false)} disabled={!isOnline} className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50" title="Appel Audio"><Phone size={20} /></button>
                  <button onClick={() => handleStartCall(true)} disabled={!isOnline} className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50" title="Appel Vidéo"><Video size={20} /></button>
                  <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
                  
                  {showMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden">
                          <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Ban size={16} /> Bloquer</button>
                          <button className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Flag size={16} /> Signaler</button>
                          <div className="border-t border-gray-100"></div>
                          <button className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"><Trash2 size={16} /> Supprimer</button>
                      </div>
                  )}
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50/30">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[70%] ${msg.sender === 'me' ? 'items-end' : 'items-start'} flex flex-col`}>
                      
                      {/* Text Message */}
                      {msg.type === 'text' && (
                          <div className={`px-4 py-2.5 md:px-5 md:py-3 rounded-2xl shadow-sm text-sm relative ${
                            msg.sender === 'me' ? 'bg-eveneo-blue text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                          } ${msg.isPending ? 'opacity-70' : ''}`}>
                             {(() => {
                               const safeText = chatSafetyService.sanitizeTextLocal(msg.text || '');
                               if (safeText.includes('http')) {
                                   const parts = safeText.split('http');
                                   return <span>{parts[0]}<a href={`http${parts[1]}`} target="_blank" rel="noreferrer" className="underline font-bold text-inherit break-all">Lien d'appel</a></span>;
                               }
                               return safeText;
                             })()}
                             {msg.isPending && <span className="absolute -left-6 top-1/2 transform -translate-y-1/2 text-gray-400" title="En attente"><ClockIcon size={14} /></span>}
                          </div>
                      )}

                      {msg.type === 'file' && msg.fileUrl && (
                        <div className={`rounded-2xl shadow-sm overflow-hidden border ${msg.sender === 'me' ? 'border-eveneo-blue/20' : 'border-gray-200'} ${msg.isPending ? 'opacity-70' : ''}`}>
                          <img src={msg.fileUrl} className="max-w-[280px] md:max-w-[340px] max-h-[340px] object-cover" alt="Pièce jointe" />
                        </div>
                      )}

                      {/* Offer Bubble */}
                      {msg.type === 'offer' && msg.offerDetails && (
                          <div className={`bg-white border rounded-xl w-full md:w-72 shadow-md overflow-hidden ${msg.offerDetails.status === 'accepted' ? 'border-green-500' : 'border-eveneo-violet'}`}>
                              <div className={`${msg.offerDetails.status === 'accepted' ? 'bg-green-500' : 'bg-eveneo-violet'} text-white p-3 flex justify-between items-center`}>
                                  <span className="font-bold text-sm flex items-center gap-2"><ShoppingBag size={16} /> Offre</span>
                                  <span className="font-bold text-lg">{msg.offerDetails.price}</span>
                              </div>
                              <div className="p-4">
                                  <h4 className="font-bold text-gray-900 mb-2">{msg.offerDetails.title}</h4>
                                  <p className="text-sm text-gray-500 mb-4">{msg.offerDetails.description}</p>
                                  {msg.offerDetails.status === 'pending' ? (
                                      currentUser?.role === UserRole.CLIENT ? (
                                          <Button variant="primary" fullWidth size="sm" onClick={() => initiateAcceptOffer(msg.id)}>Ajouter à l'événement</Button>
                                      ) : (
                                          <Button variant="secondary" fullWidth size="sm" onClick={() => handleEditOffer(msg)} className="border-gray-200"><Edit2 size={14} className="mr-2" /> Modifier l'offre</Button>
                                      )
                                  ) : (
                                      <div className="bg-green-100 text-green-700 text-center py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Check size={16} /> Offre Acceptée</div>
                                  )}
                              </div>
                          </div>
                      )}

                      <span className="text-xs text-gray-400 mt-1 px-1 flex items-center gap-1">{msg.time}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 md:p-4 bg-white border-t border-gray-100 pb-safe">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5 md:gap-1">
                      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <button type="button" onClick={() => imageInputRef.current?.click()} className="p-2 text-gray-400 hover:text-eveneo-violet hover:bg-gray-100 rounded-full transition-colors"><Paperclip size={20} /></button>
                      <button className="hidden md:block p-2 text-gray-400 hover:text-eveneo-violet hover:bg-gray-100 rounded-full transition-colors"><Mic size={20} /></button>
                      {currentUser?.role === UserRole.PROVIDER && (
                          <button className="p-2 text-gray-400 hover:text-eveneo-violet hover:bg-gray-100 rounded-full transition-colors" onClick={() => { setEditingOfferId(null); setOfferForm({ title: '', price: '', desc: '' }); setShowOfferModal(true); }}><ShoppingBag size={20} /></button>
                      )}
                  </div>
                  <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend('text')} placeholder="Message..." className="flex-grow bg-gray-100 rounded-full px-4 py-2.5 md:px-5 md:py-3 focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20 transition-all text-sm" />
                  <button onClick={() => handleSend('text')} className="p-2.5 md:p-3 bg-eveneo-gradient text-white rounded-full hover:scale-105 transition-transform shadow-glow shrink-0"><Send size={18} /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-grow flex items-center justify-center text-gray-400 flex-col gap-4 p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center"><Search size={32} /></div>
              <p>Sélectionnez une conversation.</p>
            </div>
          )}

          {/* Calling Modal */}
          {isCalling && (
              <div className="absolute inset-0 z-50 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in">
                  <div className="w-24 h-24 rounded-full bg-gray-700 mb-6 flex items-center justify-center animate-pulse"><img src={activeContact?.avatar} className="w-20 h-20 rounded-full" alt="" /></div>
                  <h2 className="text-2xl font-bold mb-2">{activeContact?.name}</h2>
                  <p className="text-gray-400 mb-12">Appel sécurisé...</p>
              </div>
          )}

          {/* Offer Modal */}
          {showOfferModal && (
              <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                      <h3 className="font-bold text-lg mb-4">{editingOfferId ? 'Modifier l\'offre' : 'Créer un Pack Personnalisé'}</h3>
                      <form onSubmit={handleCreateOrUpdateOffer}>
                          <div className="space-y-3 mb-4">
                              <input name="title" placeholder="Titre (ex: Pack 3h)" className="w-full p-2 border rounded-lg" value={offerForm.title} onChange={e => setOfferForm({...offerForm, title: e.target.value})} required />
                              <input name="price" type="number" placeholder="Prix (€)" className="w-full p-2 border rounded-lg" value={offerForm.price} onChange={e => setOfferForm({...offerForm, price: e.target.value})} required />
                              <textarea name="desc" placeholder="Détails..." className="w-full p-2 border rounded-lg h-24" value={offerForm.desc} onChange={e => setOfferForm({...offerForm, desc: e.target.value})} required />
                          </div>
                          <div className="flex gap-2">
                              <Button type="button" variant="ghost" fullWidth onClick={() => setShowOfferModal(false)}>Annuler</Button>
                              <Button type="submit" variant="primary" fullWidth>{editingOfferId ? 'Mettre à jour' : 'Envoyer'}</Button>
                          </div>
                      </form>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ClockIcon: React.FC<{size?: number}> = ({size}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);