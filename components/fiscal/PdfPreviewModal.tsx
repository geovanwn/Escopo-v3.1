import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loader2 } from 'lucide-react';

interface PdfPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    previewUrl: string | null;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({
    isOpen,
    onClose,
    previewUrl
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Pré-visualização do Relatório"
            maxWidth="max-w-6xl"
        >
            <div className="flex flex-col h-[80vh]">
                {previewUrl ? (
                    <iframe
                        src={previewUrl}
                        className="w-full h-full border-none rounded-lg"
                        title="Preview PDF"
                    />
                ) : (
                    <div className="flex items-center justify-center flex-1">
                        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
                    </div>
                )}
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button variant="primary" onClick={() => {
                        if (previewUrl) {
                            const link = document.createElement('a');
                            link.href = previewUrl;
                            link.download = `relatorio_fiscal.pdf`;
                            link.click();
                        }
                    }}>Download PDF</Button>
                </div>
            </div>
        </Modal>
    );
};
