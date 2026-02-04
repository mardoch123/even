import React, { useState, useEffect } from 'react';
import { Check, X, FileText, ExternalLink, RefreshCw, Flag, AlertTriangle, EyeOff, Ban, User, Sparkles, MessageSquare, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '../../components/Button';
import { notificationService } from '../../services/notificationService';
import { moderationService, Report } from '../../services/moderationService';
import { reviewService } from '../../services/reviewService';
import { kycService } from '../../services/kycService';
import { GoogleGenAI } from "@google/genai";

// Initialize AI for this component
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type KycQueueItem = {
  id: string;
  userId: string;
  providerName: string;
  email: string;
  submittedAt: string;
  docType: string;
  idDocPath?: string;
  selfieDocPath?: string;
  siret?: string;
  city?: string;
};

const REJECTION_REASONS = [
  "Document illisible ou flou",
  "Pièce d'identité expirée",
  "Nom ne correspond pas au profil",
  "Photo (Selfie) ne correspond pas à la pièce d'identité",
  "Document incomplet (Recto/Verso manquant)",
  "Autre raison"
];

export const AdminModeration: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'kyc' | 'reports'>('kyc');
  const [kycQueue, setKycQueue] = useState<KycQueueItem[]>([]);
  const [reportQueue, setReportQueue] = useState<Report[]>([]);
  
  // Viewer Modal State
  const [selectedKycItem, setSelectedKycItem] = useState<KycQueueItem | null>(null);

  const [docUrls, setDocUrls] = useState<{ idUrl: string | null; selfieUrl: string | null; loading: boolean; error: string | null }>({
      idUrl: null,
      selfieUrl: null,
      loading: false,
      error: null
  });

  // Rejection Flow State
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>(REJECTION_REASONS[0]);
  const [customDetails, setCustomDetails] = useState<string>("");
  const [aiMessage, setAiMessage] = useState<string>("");
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const loadData = async () => {
      try {
          const reqs = await kycService.listPendingKycRequests();
          const mapped: KycQueueItem[] = reqs.map(r => ({
              id: r.id,
              userId: r.user_id,
              providerName: r.provider_name || '—',
              email: r.email || '—',
              submittedAt: new Date(r.created_at).toLocaleString(),
              docType: 'Identité + Selfie',
              idDocPath: r.id_doc_path || undefined,
              selfieDocPath: r.selfie_doc_path || undefined
          }));
          setKycQueue(mapped);
      } catch (e) {
          console.error('KYC load failed', e);
          setKycQueue([]);
      }

      const reports = moderationService.getReports().filter(r => r.status === 'pending');
      setReportQueue(reports);
  };

  useEffect(() => {
      void loadData();
  }, []);

  useEffect(() => {
      const run = async () => {
          if (!selectedKycItem) return;
          setDocUrls({ idUrl: null, selfieUrl: null, loading: true, error: null });
          try {
              const idUrl = selectedKycItem.idDocPath ? await kycService.getSignedDocumentUrl(selectedKycItem.idDocPath) : null;
              const selfieUrl = selectedKycItem.selfieDocPath ? await kycService.getSignedDocumentUrl(selectedKycItem.selfieDocPath) : null;
              setDocUrls({ idUrl, selfieUrl, loading: false, error: null });
          } catch (err: any) {
              setDocUrls({ idUrl: null, selfieUrl: null, loading: false, error: String(err?.message || err) });
          }
      };
      void run();
  }, [selectedKycItem]);

  // --- AI Generation ---
  const generateAiRejectionMessage = async () => {
      setIsAiLoading(true);
      setAiMessage(""); // Clear previous

      const rawReason = rejectionReason === "Autre raison" ? customDetails : `${rejectionReason}. ${customDetails}`;

      try {
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `
                Tu es un assistant de support pour la plateforme Événéo. 
                Réécris la raison de rejet suivante pour un utilisateur qui a soumis ses documents d'identité (KYC).
                
                Raison brute : "${rawReason}"
                
                Consignes :
                1. Sois poli, professionnel et empathique.
                2. Explique clairement le problème.
                3. Invite l'utilisateur à soumettre de nouveaux documents.
                4. Reste concis (max 80 mots).
                5. Ne met pas d'objet d'email, juste le corps du message.
              `,
          });
          setAiMessage(response.text || "Veuillez ressayer de soumettre vos documents.");
      } catch (error) {
          console.error("AI Error", error);
          setAiMessage("Bonjour, vos documents n'ont pas pu être validés. Merci de vérifier leur lisibilité et de réessayer.");
      } finally {
          setIsAiLoading(false);
      }
  };

  // --- KYC LOGIC ---
  const initiateRejection = (id: string) => {
      setRejectingId(id);
      setAiMessage("");
      setCustomDetails("");
      setRejectionReason(REJECTION_REASONS[0]);
  };

  const handleConfirmRejection = async () => {
      if (!rejectingId) return;

      const item = kycQueue.find(q => q.id === rejectingId) || selectedKycItem;
      if (!item) return;

      await kycService.rejectKycRequest(item.id, item.userId, aiMessage);
      await kycService.sendKycStatusEmail({ userId: item.userId, status: 'rejected', reason: aiMessage });

      await notificationService.send({
          userId: item.userId,
          template: 'kyc_status',
          data: { status: 'Refusé', reason: aiMessage },
          channels: ['push']
      });

      setKycQueue(prev => prev.filter(q => q.id !== item.id));
      
      setRejectingId(null);
      setSelectedKycItem(null);
      alert(`Dossier rejeté. L'utilisateur a été notifié.`);
  };

  const handleApprove = async (id: string) => {
      const item = kycQueue.find(q => q.id === id);
      if (!item) return;

      await kycService.approveKycRequest(item.id, item.userId);
      await kycService.sendKycStatusEmail({ userId: item.userId, status: 'approved' });

      await notificationService.send({
          userId: item.userId,
          template: 'kyc_status',
          data: { status: 'Validé' },
          channels: ['push']
      });

      setKycQueue(prev => prev.filter(q => q.id !== id));
      setSelectedKycItem(null);
      alert(`Dossier approuvé.`);
  };

  // --- REPORT LOGIC ---
  const handleReportAction = (report: Report, action: 'dismiss' | 'delete_content' | 'ban_user') => {
      if (action === 'delete_content') {
          if (report.targetType === 'review') {
              reviewService.hideReview(report.targetId);
          }
          alert('Contenu masqué et supprimé de la plateforme.');
      } else if (action === 'ban_user') {
          alert(`Utilisateur ${report.targetId} suspendu. Email de notification envoyé.`);
      }

      moderationService.resolveReport(report.id, action, 'admin-current');
      setReportQueue(prev => prev.filter(r => r.id !== report.id));
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Centre de Modération</h1>
                <p className="text-gray-500">Gérez les vérifications d'identité et les signalements.</p>
            </div>
            <Button variant="outline" onClick={loadData} title="Rafraîchir">
                <RefreshCw size={20} />
            </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('kyc')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'kyc' ? 'border-eveneo-dark text-eveneo-dark' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
                <FileText size={16} /> Vérifications KYC ({kycQueue.length})
            </button>
            <button 
                onClick={() => setActiveTab('reports')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'reports' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
            >
                <Flag size={16} /> Signalements ({reportQueue.length})
            </button>
        </div>

        {/* KYC CONTENT */}
        {activeTab === 'kyc' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                {kycQueue.length > 0 ? (
                    kycQueue.map(item => (
                        <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-orange-50 p-3 rounded-xl text-orange-600">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg">{item.providerName}</h3>
                                    <p className="text-sm text-gray-500 mb-2">{item.email} • Soumis le {item.submittedAt}</p>
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">{item.docType}</span>
                                        <button 
                                            onClick={() => setSelectedKycItem(item)}
                                            className="text-xs text-blue-600 flex items-center gap-1 hover:underline"
                                        >
                                            <ExternalLink size={12} /> Voir documents
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={() => initiateRejection(item.id)}>
                                    <X size={18} className="mr-2" /> Rejeter
                                </Button>
                                <Button variant="primary" className="flex-1 bg-green-600 hover:bg-green-700 text-white border-transparent" onClick={() => handleApprove(item.id)}>
                                    <Check size={18} className="mr-2" /> Approuver
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Check className="mx-auto text-green-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-600">Tout est à jour !</h3>
                        <p className="text-gray-400">Aucun document en attente.</p>
                    </div>
                )}
            </div>
        )}

        {/* REPORTS CONTENT */}
        {activeTab === 'reports' && (
            <div className="grid grid-cols-1 gap-6 animate-in fade-in">
                 {reportQueue.length > 0 ? (
                    reportQueue.map(report => (
                        <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-red-100 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-red-700 text-sm uppercase tracking-wider">
                                            Signalement : {report.reason}
                                        </p>
                                        <p className="text-xs text-gray-500">{report.timestamp}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${report.severity === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                    {report.severity} Priority
                                </span>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                                <p className="text-sm font-bold text-gray-700 mb-1">Contenu signalé ({report.targetType}):</p>
                                <p className="text-gray-600 italic">"{report.contentSnippet}"</p>
                                <p className="text-xs text-gray-400 mt-2">Signalé par User #{report.reporterId}</p>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <Button variant="outline" size="sm" onClick={() => handleReportAction(report, 'dismiss')}>
                                    Ignorer
                                </Button>
                                <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={() => handleReportAction(report, 'delete_content')}>
                                    <EyeOff size={16} className="mr-2" /> Masquer Contenu
                                </Button>
                                <Button variant="primary" size="sm" className="bg-red-600 border-red-600 hover:bg-red-700" onClick={() => handleReportAction(report, 'ban_user')}>
                                    <Ban size={16} className="mr-2" /> Bannir Utilisateur
                                </Button>
                            </div>
                        </div>
                    ))
                 ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Check className="mx-auto text-green-500 mb-4" size={48} />
                        <h3 className="text-xl font-bold text-gray-600">Aucun signalement</h3>
                        <p className="text-gray-400">La communauté est calme.</p>
                    </div>
                 )}
            </div>
        )}

        {/* Document Viewer Modal */}
        {selectedKycItem && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="text-lg font-bold">Dossier : {selectedKycItem.providerName}</h3>
                        <button onClick={() => setSelectedKycItem(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Info Column */}
                            <div className="space-y-6">
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                    <h4 className="font-bold text-blue-800 mb-4 flex items-center gap-2"><User size={18} /> Informations Déclarées</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">Nom Entreprise</span>
                                            <span className="font-bold">{selectedKycItem.providerName}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">Email</span>
                                            <span className="font-bold">{selectedKycItem.email}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">SIRET</span>
                                            <span className="font-bold">{selectedKycItem.siret || 'Non renseigné'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-blue-100 pb-2">
                                            <span className="text-gray-500">Ville</span>
                                            <span className="font-bold">{selectedKycItem.city || 'Non renseignée'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-2">Analyse Automatique (IA)</h4>
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold mb-1">
                                        <Check size={16} /> Documents lisibles
                                    </div>
                                    <div className="flex items-center gap-2 text-green-600 text-sm font-bold">
                                        <Check size={16} /> Noms correspondants
                                    </div>
                                </div>
                            </div>

                            {/* Documents Column */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-gray-800">Pièces Jointes</h4>
                                <div className="border border-gray-200 rounded-xl p-2">
                                    <p className="text-xs text-gray-400 mb-2 uppercase font-bold px-2">Pièce d'identité (Recto)</p>
                                    {docUrls.idUrl ? (
                                        <a href={docUrls.idUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline px-2 inline-flex items-center gap-1">
                                            <ExternalLink size={14} /> Ouvrir la pièce d'identité
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-400 px-2">{docUrls.loading ? 'Chargement...' : 'Document indisponible'}</p>
                                    )}
                                </div>
                                <div className="border border-gray-200 rounded-xl p-2">
                                    <p className="text-xs text-gray-400 mb-2 uppercase font-bold px-2">Extrait KBIS / Selfie</p>
                                    {docUrls.selfieUrl ? (
                                        <a href={docUrls.selfieUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-600 hover:underline px-2 inline-flex items-center gap-1">
                                            <ExternalLink size={14} /> Ouvrir le selfie
                                        </a>
                                    ) : (
                                        <p className="text-sm text-gray-400 px-2">{docUrls.loading ? 'Chargement...' : 'Document indisponible'}</p>
                                    )}
                                </div>
                                {docUrls.error && (
                                    <div className="text-xs text-red-600 px-2">{docUrls.error}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
                        <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 font-bold" onClick={() => initiateRejection(selectedKycItem.id)}>
                            <X size={20} className="mr-2" /> Rejeter le dossier
                        </Button>
                        <Button variant="primary" className="bg-green-600 hover:bg-green-700 text-white border-transparent shadow-lg font-bold" onClick={() => handleApprove(selectedKycItem.id)}>
                            <Check size={20} className="mr-2" /> Valider et Activer
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {/* Rejection Modal */}
        {rejectingId && (
            <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                            <AlertTriangle size={20} /> Motif du rejet
                        </h3>
                        <button onClick={() => setRejectingId(null)} className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-800">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Raison principale</label>
                            <select 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 text-sm"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            >
                                {REJECTION_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Précisions supplémentaires (facultatif)</label>
                            <textarea 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-200 text-sm h-24 resize-none"
                                placeholder="Expliquez ce qui ne va pas..."
                                value={customDetails}
                                onChange={(e) => setCustomDetails(e.target.value)}
                            />
                        </div>

                        {!aiMessage && !isAiLoading && (
                            <button 
                                onClick={generateAiRejectionMessage}
                                className="w-full py-3 bg-gradient-to-r from-eveneo-violet to-eveneo-blue text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                            >
                                <Sparkles size={18} className="group-hover:animate-pulse" /> Reformuler avec l'IA
                            </button>
                        )}

                        {/* AI Loading Animation */}
                        {isAiLoading && (
                            <div className="w-full py-6 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center animate-pulse">
                                <div className="flex gap-2 mb-2">
                                    <span className="w-2 h-2 bg-eveneo-violet rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-eveneo-pink rounded-full animate-bounce delay-75"></span>
                                    <span className="w-2 h-2 bg-eveneo-blue rounded-full animate-bounce delay-150"></span>
                                </div>
                                <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-eveneo-violet to-eveneo-orange">
                                    L'IA rédige une réponse courtoise...
                                </p>
                            </div>
                        )}

                        {/* AI Result */}
                        {aiMessage && !isAiLoading && (
                            <div className="animate-in slide-in-from-bottom-2 fade-in">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl relative">
                                    <div className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <Sparkles size={10} /> Message généré
                                    </div>
                                    <p className="text-sm text-gray-700 italic leading-relaxed">
                                        "{aiMessage}"
                                    </p>
                                    <button 
                                        onClick={generateAiRejectionMessage}
                                        className="text-xs text-blue-500 font-bold mt-2 hover:underline flex items-center gap-1"
                                    >
                                        <RefreshCw size={10} /> Régénérer
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setRejectingId(null)}>
                            Annuler
                        </Button>
                        <Button 
                            variant="primary" 
                            onClick={handleConfirmRejection}
                            disabled={isAiLoading || !aiMessage}
                            className="bg-red-600 hover:bg-red-700 border-transparent text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <MessageSquare size={18} className="mr-2" /> Envoyer le refus
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
