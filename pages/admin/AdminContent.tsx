
import React, { useState, useEffect } from 'react';
import { Save, FileText } from 'lucide-react';
import { Button } from '../../components/Button';
import { cmsService, PageType } from '../../services/cmsService';

export const AdminContent: React.FC = () => {
    const [activePage, setActivePage] = useState<PageType>('legal');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const data = cmsService.getPage(activePage);
        setContent(data.content);
    }, [activePage]);

    const handleSave = () => {
        setIsLoading(true);
        setTimeout(() => {
            cmsService.savePage(activePage, content);
            setIsLoading(false);
            alert('Contenu mis à jour avec succès !');
        }, 500);
    };

    const pages: {id: PageType, label: string}[] = [
        { id: 'legal', label: 'Mentions Légales' },
        { id: 'terms', label: 'CGU / CGV' },
        { id: 'privacy', label: 'Confidentialité' },
        { id: 'help', label: "Centre d'Aide" },
        { id: 'community', label: 'Charte de la communauté' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion du Contenu</h1>
            <p className="text-gray-500 mb-8">Modifiez les pages statiques du site.</p>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Menu */}
                <div className="space-y-2">
                    {pages.map(page => (
                        <button
                            key={page.id}
                            onClick={() => setActivePage(page.id)}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                                activePage === page.id 
                                ? 'bg-eveneo-dark text-white shadow-md' 
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <FileText size={18} />
                            <span className="font-medium">{page.label}</span>
                        </button>
                    ))}
                </div>

                {/* Editor */}
                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            {pages.find(p => p.id === activePage)?.label}
                        </h2>
                        <Button variant="primary" onClick={handleSave} disabled={isLoading}>
                            <Save size={18} className="mr-2" /> {isLoading ? 'Enregistrement...' : 'Sauvegarder'}
                        </Button>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2">Vous pouvez utiliser du texte brut. Les sauts de ligne seront respectés.</p>
                    
                    <textarea 
                        className="w-full h-[500px] p-4 border border-gray-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-eveneo-violet/20 outline-none resize-none"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};
