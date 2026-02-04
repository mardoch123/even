
export type PageType = 'legal' | 'terms' | 'privacy' | 'help' | 'community';

interface PageContent {
    title: string;
    content: string;
    lastUpdated: string;
}

const DEFAULTS: Record<PageType, PageContent> = {
    legal: {
        title: 'Mentions Légales',
        content: "Éditeur du site : Événéo SAS au capital de 10 000€\nSiège social : 12 Avenue des Champs-Élysées, 75008 Paris\nRCS Paris B 123 456 789\n\nHébergeur : Cloud Event Host, 123 Server Lane, Dublin, Ireland.",
        lastUpdated: new Date().toISOString()
    },
    terms: {
        title: 'Conditions Générales d\'Utilisation (CGU/CGV)',
        content: "ARTICLE 1 : OBJET\nLes présentes conditions régissent l'utilisation de la plateforme Événéo...\n\nARTICLE 2 : PRIX\nLes prix sont indiqués en euros toutes taxes comprises...",
        lastUpdated: new Date().toISOString()
    },
    privacy: {
        title: 'Politique de Confidentialité',
        content: "La protection de vos données est notre priorité. Nous collectons les données suivantes : Nom, Email, Préférences événementielles...\nConformément au RGPD, vous disposez d'un droit d'accès...",
        lastUpdated: new Date().toISOString()
    },
    help: {
        title: 'Centre d\'Aide',
        content: "1. Comment réserver ?\nIl suffit de créer un compte et de sélectionner un prestataire.\n\n2. Comment payer ?\nLe paiement se fait par carte bancaire via notre partenaire sécurisé Stripe.",
        lastUpdated: new Date().toISOString()
    },
    community: {
        title: 'Charte de la communauté',
        content: "CHARTE DE LA COMMUNAUTÉ (COMMUNITY GUIDELINES)\n\nChez Evénéo, la confiance est notre monnaie. Voici les règles absolues :\n\n1. TOLÉRANCE ZÉRO : DISCRIMINATION ET HARCÈLEMENT\nEvénéo est une plateforme inclusive. Tout refus de service, commentaire ou comportement basé sur la race, la religion, le genre, l'orientation sexuelle ou le handicap entraînera un bannissement immédiat et définitif.\n\n2. QUALITÉ ET VÉRACITÉ (PAS DE \"CATFISHING\")\n- Prestataires : Les photos de votre portfolio doivent être vos propres créations. Utiliser des photos volées sur Pinterest ou Google Images pour tromper un client est interdit.\n- Clients : Les demandes doivent correspondre à des événements réels.\n\n3. POLITIQUE ANTI-CONTOURNEMENT (HORS PLATEFORME)\nC'est la règle d'or pour la survie d'Evénéo.\n- Interdiction : Il est strictement interdit de proposer ou d'accepter un paiement en dehors de la plateforme (en espèces, virement direct) pour une mise en relation initiée sur Evénéo.\n- Détection : Nos systèmes (et notre IA) scannent les messages pour détecter les échanges de numéros de téléphone ou d'emails avant la réservation confirmée.\n- Sanction : En cas de tentative de contournement, l'utilisateur s'expose à la suspension de son compte et à une pénalité forfaitaire de [ex: 150$] à revoir pour frais de dossier.\n\n4. ANNULATIONS ET NO-SHOW\nLe respect de la parole donnée est crucial. Un Prestataire qui ne se présente pas à un événement confirmé (\"No-Show\") sans motif de force majeure grave sera banni de la plateforme.",
        lastUpdated: new Date().toISOString()
    }
};

export const cmsService = {
    getPage: (type: PageType): PageContent => {
        const stored = localStorage.getItem(`cms_${type}`);
        return stored ? JSON.parse(stored) : DEFAULTS[type];
    },

    savePage: (type: PageType, content: string) => {
        const pageData: PageContent = {
            title: DEFAULTS[type].title,
            content: content,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(`cms_${type}`, JSON.stringify(pageData));
    }
};
