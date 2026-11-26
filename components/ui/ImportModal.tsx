import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Upload, Download, FileSpreadsheet, X } from 'lucide-react';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (file: File) => void;
    onDownloadTemplate: () => void;
    title?: string;
}

export const ImportModal: React.FC<ImportModalProps> = ({
    isOpen,
    onClose,
    onImport,
    onDownloadTemplate,
    title = 'Importar Dados'
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (file) {
            onImport(file);
            setFile(null); // Reset after import attempt
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
            <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                        <FileSpreadsheet size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 text-sm">Modelo de Importação</h4>
                        <p className="text-xs text-blue-700 mt-1 mb-3">
                            Utilize nossa planilha padrão para garantir que seus dados sejam importados corretamente.
                        </p>
                        <button
                            onClick={onDownloadTemplate}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                        >
                            <Download size={14} />
                            Baixar Planilha Modelo
                        </button>
                    </div>
                </div>

                <div
                    className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                        ${dragActive ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}
                        ${file ? 'bg-gray-50 border-gray-400' : ''}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleChange}
                    />

                    {file ? (
                        <>
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                                <FileSpreadsheet size={24} />
                            </div>
                            <p className="font-bold text-gray-800 text-sm">{file.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                className="mt-4 text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                            >
                                <X size={12} /> Remover Arquivo
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-3">
                                <Upload size={24} />
                            </div>
                            <p className="font-bold text-gray-700 text-sm">Clique ou arraste seu arquivo aqui</p>
                            <p className="text-xs text-gray-400 mt-1">Suporta CSV, Excel (.xlsx)</p>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                    <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={!file}>Importar</Button>
                </div>
            </div>
        </Modal>
    );
};
