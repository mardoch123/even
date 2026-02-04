
import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Plus, Trash2, DollarSign, CheckSquare, List, LayoutGrid } from 'lucide-react';
import { Button } from '../../components/Button';
import { planService } from '../../services/planService';
import { PricingPlan } from '../../types';

export const AdminSubscriptions: React.FC = () => {
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setPlans(planService.getPlans());
    }, []);

    const handleUpdatePlan = (index: number, field: keyof PricingPlan, value: any) => {
        const newPlans = [...plans];
        newPlans[index] = { ...newPlans[index], [field]: value };
        setPlans(newPlans);
    };

    const handleFeatureChange = (planIndex: number, featureIndex: number, value: string) => {
        const newPlans = [...plans];
        newPlans[planIndex].features[featureIndex] = value;
        setPlans(newPlans);
    };

    const addFeature = (planIndex: number) => {
        const newPlans = [...plans];
        newPlans[planIndex].features.push("Nouvelle fonctionnalité");
        setPlans(newPlans);
    };

    const removeFeature = (planIndex: number, featureIndex: number) => {
        const newPlans = [...plans];
        newPlans[planIndex].features.splice(featureIndex, 1);
        setPlans(newPlans);
    };

    const handleSave = () => {
        setIsLoading(true);
        setTimeout(() => {
            planService.savePlans(plans);
            setIsLoading(false);
            alert('Plans mis à jour avec succès !');
        }, 800);
    };

    const handleReset = () => {
        if(confirm('Réinitialiser tous les plans aux valeurs par défaut ?')) {
            setPlans(planService.resetDefaults());
        }
    };

    return (
        <div className="pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestion des Abonnements</h1>
                    <p className="text-gray-500">Modifiez les prix et les fonctionnalités des plans prestataires.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleReset} className="text-gray-500 border-gray-300">
                        <RotateCcw size={18} className="mr-2" /> Réinitialiser
                    </Button>
                    <Button variant="primary" onClick={handleSave} disabled={isLoading}>
                        <Save size={18} className="mr-2" /> {isLoading ? 'Enregistrement...' : 'Sauvegarder'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {plans.map((plan, pIndex) => (
                    <div key={plan.id} className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden flex flex-col">
                        
                        {/* Plan Header */}
                        <div className={`p-6 border-b border-gray-100 ${plan.recommended ? 'bg-eveneo-violet/5' : 'bg-gray-50'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <LayoutGrid size={20} className={plan.recommended ? "text-eveneo-violet" : "text-gray-400"} />
                                    <input 
                                        value={plan.name}
                                        onChange={(e) => handleUpdatePlan(pIndex, 'name', e.target.value)}
                                        className="bg-transparent text-xl font-bold text-gray-900 border-b border-transparent focus:border-gray-300 focus:outline-none w-full"
                                    />
                                </div>
                                {plan.recommended && <span className="bg-eveneo-violet text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase">Top</span>}
                            </div>

                            <div className="relative">
                                <DollarSign size={24} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="number"
                                    value={plan.price}
                                    onChange={(e) => handleUpdatePlan(pIndex, 'price', Number(e.target.value))}
                                    className="w-full pl-8 py-2 bg-white rounded-xl text-3xl font-black text-gray-900 border border-gray-200 focus:border-eveneo-violet focus:ring-2 focus:ring-eveneo-violet/20 outline-none"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">/ mois</span>
                            </div>
                        </div>

                        {/* Features Editor */}
                        <div className="flex-grow p-6">
                            <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                                <List size={14} /> Liste des fonctionnalités
                            </h4>
                            
                            <div className="space-y-3">
                                {plan.features.map((feature, fIndex) => (
                                    <div key={fIndex} className="group flex items-center gap-3 bg-white p-2 rounded-lg border border-transparent hover:border-gray-200 hover:shadow-sm transition-all">
                                        <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <CheckSquare size={12} />
                                        </div>
                                        <input 
                                            value={feature}
                                            onChange={(e) => handleFeatureChange(pIndex, fIndex, e.target.value)}
                                            className="flex-grow text-sm text-gray-700 border-none focus:ring-0 p-0 bg-transparent font-medium"
                                            placeholder="Description..."
                                        />
                                        <button 
                                            onClick={() => removeFeature(pIndex, fIndex)}
                                            className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Supprimer la ligne"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button 
                                onClick={() => addFeature(pIndex)}
                                className="w-full mt-6 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-bold hover:border-eveneo-violet hover:text-eveneo-violet hover:bg-violet-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={16} /> Ajouter une fonctionnalité
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
