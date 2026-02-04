import { supabase, supabaseConfigError } from './supabaseClient';

export type SubmitKycDocumentsInput = {
    userId: string;
    providerName: string;
    email: string;
    idFile: File;
    selfieFile: File;
};

export type KycRequestStatus = 'pending' | 'verified' | 'rejected';

export type KycRequest = {
    id: string;
    user_id: string;
    provider_name: string | null;
    email: string | null;
    id_doc_path: string | null;
    selfie_doc_path: string | null;
    status: KycRequestStatus;
    rejection_reason: string | null;
    created_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
};

export type KycStatusEmailInput = {
    userId: string;
    status: 'approved' | 'rejected';
    reason?: string;
};

const assertAuthenticated = async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!data?.user?.id) throw new Error('Utilisateur non authentifié.');
    return data.user;
};

const buildObjectPath = (userId: string, kind: 'id' | 'selfie', file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const safeExt = ext && ext.length <= 8 ? ext : 'bin';
    const ts = Date.now();
    return `${userId}/${ts}-${kind}.${safeExt}`;
};

const KYC_BUCKET = 'kyc-documents';

export const kycService = {
    async submitKycDocuments(input: SubmitKycDocumentsInput): Promise<void> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }

        const user = await assertAuthenticated();
        if (user.id !== input.userId) {
            throw new Error('Utilisateur invalide pour la soumission KYC.');
        }

        const idPath = buildObjectPath(input.userId, 'id', input.idFile);
        const selfiePath = buildObjectPath(input.userId, 'selfie', input.selfieFile);

        const { error: idUploadError } = await supabase.storage
            .from(KYC_BUCKET)
            .upload(idPath, input.idFile, {
                upsert: true,
                contentType: input.idFile.type || undefined
            });
        if (idUploadError) {
            throw new Error(`Upload pièce d'identité impossible: ${idUploadError.message}`);
        }

        const { error: selfieUploadError } = await supabase.storage
            .from(KYC_BUCKET)
            .upload(selfiePath, input.selfieFile, {
                upsert: true,
                contentType: input.selfieFile.type || undefined
            });
        if (selfieUploadError) {
            throw new Error(`Upload selfie impossible: ${selfieUploadError.message}`);
        }

        const { error: insertError } = await supabase
            .from('kyc_requests')
            .insert({
                user_id: input.userId,
                provider_name: input.providerName,
                email: input.email,
                id_doc_path: idPath,
                selfie_doc_path: selfiePath,
                status: 'pending'
            });
        if (insertError) {
            throw new Error(`Création de la demande KYC impossible: ${insertError.message}`);
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ kyc_status: 'pending' })
            .eq('id', input.userId);

        if (profileError) {
            throw new Error(`Mise à jour du profil impossible: ${profileError.message}`);
        }
    },

    async listPendingKycRequests(): Promise<KycRequest[]> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }

        const { data, error } = await supabase
            .from('kyc_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error(`Chargement des demandes KYC impossible: ${error.message}`);
        }

        return (data || []) as KycRequest[];
    },

    async approveKycRequest(requestId: string, userId: string): Promise<void> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }

        const reviewer = await assertAuthenticated();

        const { error: reqError } = await supabase
            .from('kyc_requests')
            .update({
                status: 'verified',
                reviewed_at: new Date().toISOString(),
                reviewed_by: reviewer.id,
                rejection_reason: null
            })
            .eq('id', requestId);

        if (reqError) {
            throw new Error(`Impossible de valider la demande KYC: ${reqError.message}`);
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ kyc_status: 'verified', is_verified: true })
            .eq('id', userId);

        if (profileError) {
            throw new Error(`Impossible de mettre à jour le profil: ${profileError.message}`);
        }
    },

    async rejectKycRequest(requestId: string, userId: string, reason: string): Promise<void> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }

        const reviewer = await assertAuthenticated();
        const cleanReason = String(reason || '').trim();

        const { error: reqError } = await supabase
            .from('kyc_requests')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: reviewer.id,
                rejection_reason: cleanReason || null
            })
            .eq('id', requestId);

        if (reqError) {
            throw new Error(`Impossible de rejeter la demande KYC: ${reqError.message}`);
        }

        const { error: profileError } = await supabase
            .from('profiles')
            .update({ kyc_status: 'rejected' })
            .eq('id', userId);

        if (profileError) {
            throw new Error(`Impossible de mettre à jour le profil: ${profileError.message}`);
        }
    },

    async sendKycStatusEmail(input: KycStatusEmailInput): Promise<void> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }

        const { error } = await supabase.functions.invoke('send-kyc-status-email', {
            body: {
                userId: input.userId,
                status: input.status,
                reason: input.reason
            }
        });

        if (error) {
            throw new Error(`Envoi email impossible: ${error.message}`);
        }
    },

    async getSignedDocumentUrl(path: string, expiresInSeconds: number = 60 * 10): Promise<string | null> {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }
        const p = String(path || '').trim();
        if (!p) return null;

        const { data, error } = await supabase.storage
            .from(KYC_BUCKET)
            .createSignedUrl(p, expiresInSeconds);

        if (error) {
            throw new Error(`Impossible de générer l'URL du document: ${error.message}`);
        }
        return data?.signedUrl || null;
    }
};
