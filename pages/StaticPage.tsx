
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { cmsService, PageType } from '../services/cmsService';

export const StaticPage: React.FC = () => {
    const { type } = useParams<{ type: string }>();
    const [data, setData] = useState({ title: '', content: '', lastUpdated: '' });

    useEffect(() => {
        if (type) {
            const pageData = cmsService.getPage(type as PageType);
            setData(pageData);
        }
    }, [type]);

    return (
        <div className="min-h-screen bg-white pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-eveneo-dark mb-4">{data.title}</h1>
                <p className="text-sm text-gray-400 mb-12">Dernière mise à jour : {new Date(data.lastUpdated).toLocaleDateString()}</p>
                
                <div className="prose max-w-none whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {data.content}
                </div>
            </div>
        </div>
    );
};
