
import React, { useState, useRef } from 'react';
import { Upload, ShieldAlert, ShieldCheck, Clock, FileText, Camera, Check, AlertCircle, Mail, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { KYCStatus } from '../types';

interface KYCSectionProps {
  status: KYCStatus;
  onStatusChange: (status: KYCStatus) => void;
}

export const KYCSection: React.FC<KYCSectionProps> = ({ status, onStatusChange }) => {
  const [step, setStep] = useState<'upload' | 'email'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for hidden file inputs
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: (f: File | null) => void) => {
      if (e.target.files && e.target.files[0]) {
          setFile(e.target.files[0]);
          setError(null);
      }
  };

  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
      if (ref.current) {
          ref.current.click();
      }
  };

  const handleSubmitDocs = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile || !selfieFile) {
        setError("Veuillez importer les deux documents (Identité et Selfie) pour continuer.");
        return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
        setIsLoading(false);
        setStep('email'); // Move to email confirmation step
    }, 1500);
  };

  const handleConfirmEmail = () => {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        onStatusChange('pending');
        
        // PUSH TO ADMIN QUEUE (Simulation)
        const existingQueue = JSON.parse(localStorage.getItem('admin_kyc_queue') || '[]');
        const newRequest = {
            id: 'provider-current-session', 
            providerName: 'Votre Profil (En attente)',
            email: 'vous@demo.com',
            submittedAt: new Date().toLocaleString(),
            docType: 'Identité + Selfie'
        };
        
        const filteredQueue = existingQueue.filter((q:any) => q.id !== newRequest.id);
        localStorage.setItem('admin_kyc_queue', JSON.stringify([newRequest, ...filteredQueue]));
      }, 1500);
  };

  if (status === 'verified') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4 mb-8">
        <div className="bg-green-100 p-3 rounded-full text-green-600">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h3 className="font-bold text-green-800 text-lg">Identité Vérifiée</h3>
          <p className="text-green-700 text-sm mt-1">
            Félicitations ! Votre profil est vérifié. Vous pouvez désormais recevoir des demandes et être payé.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="bg-amber-100 p-3 rounded-full text-amber-600">
            <Clock size={24} />
          </div>
          <div className="flex-grow">
            <h3 className="font-bold text-amber-800 text-lg">Vérification en cours</h3>
            <p className="text-amber-700 text-sm mt-1">
              Documents envoyés ! Nos équipes analysent votre dossier. Cette opération prend généralement moins de 24h.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg mb-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-eveneo-orange"></div>
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="bg-gray-50 p-4 rounded-full md:rounded-2xl text-eveneo-orange flex items-center justify-center shrink-0">
          <ShieldAlert size={32} />
        </div>
        
        <div className="flex-grow w-full">
          <h3 className="text-xl font-bold text-eveneo-dark mb-2">Action requise : Validez votre profil</h3>
          <p className="text-gray-500 text-sm mb-6">
            Pour être visible sur Événéo et recevoir des paiements, la loi nous impose de vérifier votre identité.
          </p>

          {step === 'upload' ? (
              <form onSubmit={handleSubmitDocs} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID UPLOAD */}
                <div 
                    onClick={() => triggerFileInput(idInputRef)}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-40 relative ${
                        idFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-eveneo-violet hover:bg-gray-50'
                    }`}
                >
                  {idFile ? (
                      <div className="animate-in zoom-in duration-300 pointer-events-none">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Check className="text-green-600" size={20} />
                        </div>
                        <span className="text-sm font-bold text-green-700 block max-w-[150px] truncate">{idFile.name}</span>
                        <span className="text-xs text-green-600 mt-1 block">Cliquez pour modifier</span>
                      </div>
                  ) : (
                      <div className="pointer-events-none">
                        <FileText className="text-gray-400 group-hover:text-eveneo-violet mb-2 transition-colors mx-auto" size={32} />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-eveneo-violet block">Pièce d'identité</span>
                        <span className="text-xs text-gray-400 mt-1 block">Recto/Verso (PDF, JPG)</span>
                      </div>
                  )}
                  <input 
                      type="file" 
                      ref={idInputRef}
                      onChange={(e) => handleFileChange(e, setIdFile)}
                      className="hidden"
                      accept="image/*,.pdf"
                  />
                </div>

                {/* SELFIE UPLOAD */}
                <div 
                    onClick={() => triggerFileInput(selfieInputRef)}
                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-40 relative ${
                        selfieFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-eveneo-violet hover:bg-gray-50'
                    }`}
                >
                  {selfieFile ? (
                      <div className="animate-in zoom-in duration-300 pointer-events-none">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Check className="text-green-600" size={20} />
                        </div>
                        <span className="text-sm font-bold text-green-700 block max-w-[150px] truncate">{selfieFile.name}</span>
                        <span className="text-xs text-green-600 mt-1 block">Cliquez pour modifier</span>
                      </div>
                  ) : (
                      <div className="pointer-events-none">
                        <Camera className="text-gray-400 group-hover:text-eveneo-violet mb-2 transition-colors mx-auto" size={32} />
                        <span className="text-sm font-bold text-gray-700 group-hover:text-eveneo-violet block">Selfie de vérification</span>
                        <span className="text-xs text-gray-400 mt-1 block">Photo visage découvert</span>
                      </div>
                  )}
                  <input 
                      type="file" 
                      ref={selfieInputRef}
                      onChange={(e) => handleFileChange(e, setSelfieFile)}
                      className="hidden"
                      accept="image/*"
                  />
                </div>

                {error && (
                    <div className="md:col-span-2 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="md:col-span-2 mt-2">
                  <Button 
                    variant="primary" 
                    fullWidth 
                    type="submit"
                    disabled={isLoading}
                    className={(!idFile || !selfieFile) ? "opacity-75" : ""}
                  >
                    <Upload size={18} className="mr-2" />
                    {isLoading ? 'Traitement en cours...' : 'Suivant : Confirmation Email'}
                  </Button>
                </div>
              </form>
          ) : (
              <div className="animate-in slide-in-from-right text-center py-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 animate-pulse">
                      <Mail size={32} />
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Vérifiez votre boîte mail</h4>
                  <p className="text-gray-500 max-w-md mx-auto mb-8">
                      Un email de confirmation vient d'être envoyé à <strong>vous@demo.com</strong>. Veuillez cliquer sur le lien à l'intérieur pour finaliser votre vérification.
                  </p>
                  
                  <div className="max-w-xs mx-auto space-y-3">
                       <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
                           <p className="text-xs font-bold text-gray-400 uppercase mb-2">Simulation du lien email</p>
                           <Button variant="primary" fullWidth onClick={handleConfirmEmail} disabled={isLoading}>
                               {isLoading ? 'Validation...' : 'Simuler le clic sur le lien'}
                           </Button>
                       </div>
                       <button 
                         className="text-sm text-gray-400 hover:text-gray-600 underline"
                         onClick={() => setStep('upload')}
                       >
                           Retour à l'upload
                       </button>
                  </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
