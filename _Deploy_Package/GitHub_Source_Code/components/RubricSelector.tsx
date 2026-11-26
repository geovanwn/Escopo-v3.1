import { RUBRICS } from '../constants/rubrics';
import { Plus, Check, Info, Search } from 'lucide-react';
import { useState } from 'react';

interface RubricSelectorProps {
    calculationType: string;
    selectedRubrics: string[];
    onChange: (codes: string[]) => void;
    customRubrics?: any[];
}

export const RubricSelector: React.FC<RubricSelectorProps> = ({ calculationType, selectedRubrics, onChange, customRubrics = [] }) => {
    const [searchTerm, setSearchTerm] = useState('');

    // Merge System Rubrics with Custom Rubrics
    // Custom Rubrics need to be mapped to match the RUBRICS shape partially for display
    const mergedRubrics = [
        ...RUBRICS,
        ...customRubrics.map(c => ({
            code: c.code,
            name: c.name,
            description: c.description || 'Rubrica Personalizada',
            type: c.type,
            compatibleWith: ['folha_mensal', 'rescisao', 'ferias', 'decimo_terceiro'], // Assume compatible with all for now
            calcMethod: c.calcMethod
        } as any))
    ];

    // Filter rubrics compatible with the current calculation type AND search term
    const availableRubrics = mergedRubrics.filter(r =>
        (r.compatibleWith.includes(calculationType as any) || r.compatibleWith.includes('all')) &&
        (r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.code.includes(searchTerm))
    );

    const toggleRubric = (code: string) => {
        if (selectedRubrics.includes(code)) {
            onChange(selectedRubrics.filter(c => c !== code));
        } else {
            onChange([...selectedRubrics, code]);
        }
    };

    const proventos = availableRubrics.filter(r => r.type === 'provento');
    const descontos = availableRubrics.filter(r => r.type === 'desconto');

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm mt-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
                <Plus size={16} className="text-orange-500" /> Seleção de Verbas / Opcionais
            </h3>

            <div className="mb-4 relative">
                <input
                    type="text"
                    placeholder="Buscar rubrica por nome ou código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
            </div>

            <p className="text-xs text-gray-500 mb-4">
                Selecione as verbas adicionais que farão parte deste cálculo.
                Verbas obrigatórias (como INSS, IRRF) são calculadas automaticamente.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* PROVENTOS */}
                <div>
                    <h4 className="text-xs font-semibold text-green-700 uppercase mb-3 border-b border-green-100 pb-1">Proventos (+)</h4>
                    <div className="space-y-2">
                        {proventos.map(rubric => (
                            <label key={rubric.code} className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedRubrics.includes(rubric.code)
                                ? 'bg-green-50 border-green-200 shadow-sm'
                                : 'bg-white border-transparent hover:bg-gray-50'
                                }`}>
                                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${selectedRubrics.includes(rubric.code)
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white border-gray-300'
                                    }`}>
                                    {selectedRubrics.includes(rubric.code) && <Check size={10} strokeWidth={4} />}
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedRubrics.includes(rubric.code)}
                                        onChange={() => toggleRubric(rubric.code)}
                                    />
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${selectedRubrics.includes(rubric.code) ? 'text-green-900' : 'text-gray-700'}`}>
                                        {rubric.name}
                                    </p>
                                    {rubric.description && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">{rubric.description}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                        {proventos.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum opcional disponível.</p>}
                    </div>
                </div>

                {/* DESCONTOS */}
                <div>
                    <h4 className="text-xs font-semibold text-red-700 uppercase mb-3 border-b border-red-100 pb-1">Descontos (-)</h4>
                    <div className="space-y-2">
                        {descontos.map(rubric => (
                            <label key={rubric.code} className={`flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-all ${selectedRubrics.includes(rubric.code)
                                ? 'bg-red-50 border-red-200 shadow-sm'
                                : 'bg-white border-transparent hover:bg-gray-50'
                                }`}>
                                <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${selectedRubrics.includes(rubric.code)
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'bg-white border-gray-300'
                                    }`}>
                                    {selectedRubrics.includes(rubric.code) && <Check size={10} strokeWidth={4} />}
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedRubrics.includes(rubric.code)}
                                        onChange={() => toggleRubric(rubric.code)}
                                    />
                                </div>
                                <div>
                                    <p className={`text-sm font-medium ${selectedRubrics.includes(rubric.code) ? 'text-red-900' : 'text-gray-700'}`}>
                                        {rubric.name}
                                    </p>
                                    {rubric.description && (
                                        <p className="text-[10px] text-gray-400 mt-0.5">{rubric.description}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                        {descontos.length === 0 && <p className="text-xs text-gray-400 italic">Nenhum opcional disponível.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
