
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cmsService, PageType } from '../services/cmsService';

export const StaticPage: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState({ title: '', content: '', lastUpdated: '' });

    useEffect(() => {
        if (type) {
            const pageData = cmsService.getPage(type as PageType);
            setData(pageData);
        }
    }, [type]);

    return (
        <div className="min-h-screen bg-white pt-20 pb-12 px-4">
            {/* Header avec bouton retour */}
            <header className="fixed top-0 left-0 right-0 bg-white z-40 border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
                    <button 
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900 truncate">
                        {data.title || 'Page'}
                    </h1>
                </div>
            </header>

            <div className="max-w-4xl mx-auto pt-4">
                <h1 className="text-3xl md:text-4xl font-bold text-eveneo-dark mb-4">{data.title}</h1>
                <p className="text-sm text-gray-400 mb-12">Dernière mise à jour : {new Date(data.lastUpdated).toLocaleDateString()}</p>
                
                <div className="prose max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {data.content}
                </div>
            </div>
        </div>
    );
};
