export const parseCSV = (content: string): any[] => {
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(';').map(h => h.trim().replace(/^"|"$/g, ''));

    // Helper to map comfortable headers to internal keys
    const normalizeHeader = (h: string) => {
        const lower = h.toLowerCase();
        if (lower.includes('nome') || lower.includes('razão')) return 'name';
        if (lower.includes('fantasia')) return 'fantasyName';
        if (lower.includes('cnpj') || lower.includes('cpf')) return 'cnpj'; // or cpf
        if (lower.includes('email')) return 'email';
        if (lower.includes('telef')) return 'phone';
        if (lower.includes('cep')) return 'zip';
        if (lower.includes('endereço') || lower.includes('logradouro')) return 'address';
        if (lower.includes('número')) return 'addressNumber';
        if (lower.includes('cidade')) return 'city';
        if (lower.includes('uf') || lower.includes('estado')) return 'uf';
        if (lower.includes('preço')) return 'price';
        if (lower.includes('custo')) return 'costPrice';
        if (lower.includes('código') || lower.includes('sku')) return 'code';
        if (lower.includes('descrição')) return 'description';
        return h; // Fallback
    };

    const keys = headers.map(normalizeHeader);

    return lines.slice(1).map(line => {
        // Handle semicolons inside quotes if necessary, simplified split for now
        // A robust regex split for CSV with ; delimiter
        const values = line.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));

        const obj: any = {};
        keys.forEach((key, index) => {
            if (values[index] !== undefined) {
                // Try to infer types
                let val: any = values[index];
                if (key === 'price' || key === 'costPrice' || key === 'stock') {
                    val = parseFloat(val.replace(',', '.')) || 0;
                }
                obj[key] = val;
            }
        });
        return obj;
    });
};
