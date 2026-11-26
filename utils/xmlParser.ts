import { Invoice } from '../types';

export const parseInvoiceXML = (xmlString: string, currentCompanyCnpj?: string): Partial<Invoice>[] => {
    let parsedNotes: Partial<Invoice>[] = [];
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // ======= TIPO 1: Padrão NFSe (ABRASF ou Padrão Nacional) =======
        const compsNfse = xmlDoc.getElementsByTagName("CompNfse");
        const targetNodesNfse = compsNfse.length > 0 ? compsNfse : xmlDoc.getElementsByTagName("Nfse");

        if (targetNodesNfse.length > 0) {
            for (let i = 0; i < targetNodesNfse.length; i++) {
                const node = targetNodesNfse[i];
                const inf = node.getElementsByTagName("InfNfse")[0] || node.getElementsByTagName("infNFSe")[0];
                const valores = node.getElementsByTagName("ValoresNfse")[0] || node.getElementsByTagName("Valores")[0] || node.getElementsByTagName("valores")[0];
                const prestador = node.getElementsByTagName("PrestadorServico")[0] || node.getElementsByTagName("Prestador")[0] || node.getElementsByTagName("emit")[0];
                const tomador = node.getElementsByTagName("TomadorServico")[0] || node.getElementsByTagName("Tomador")[0] || node.getElementsByTagName("toma")[0];

                const numero = inf?.getElementsByTagName("Numero")[0]?.textContent || inf?.getElementsByTagName("nNFSe")[0]?.textContent;
                const dataEmissao = inf?.getElementsByTagName("DataEmissao")[0]?.textContent || node.getElementsByTagName("dhEmi")[0]?.textContent || inf?.getElementsByTagName("dhProc")[0]?.textContent;
                
                const valorText = valores?.getElementsByTagName("ValorLiquidoNfse")[0]?.textContent || 
                                  valores?.getElementsByTagName("ValorServicos")[0]?.textContent || 
                                  valores?.getElementsByTagName("vLiq")[0]?.textContent || 
                                  node.getElementsByTagName("vServ")[0]?.textContent || '0';
                const valor = parseFloat(valorText || '0');

                const prestadorNome = prestador?.getElementsByTagName("RazaoSocial")[0]?.textContent || prestador?.getElementsByTagName("xNome")[0]?.textContent;
                const tomadorNome = tomador?.getElementsByTagName("RazaoSocial")[0]?.textContent || tomador?.getElementsByTagName("xNome")[0]?.textContent;
                
                const prestadorCnpj = prestador?.getElementsByTagName("Cnpj")[0]?.textContent || prestador?.getElementsByTagName("CNPJ")[0]?.textContent || '';
                const tomadorCnpj = tomador?.getElementsByTagName("Cnpj")[0]?.textContent || tomador?.getElementsByTagName("CNPJ")[0]?.textContent || '';

                const vISSQNText = valores?.getElementsByTagName("ValorIss")[0]?.textContent || node.getElementsByTagName("vISSQN")[0]?.textContent || '0';
                const vPISText = node.getElementsByTagName("ValorPis")[0]?.textContent || node.getElementsByTagName("vPIS")[0]?.textContent || '0';
                const vCOFINSText = node.getElementsByTagName("ValorCofins")[0]?.textContent || node.getElementsByTagName("vCOFINS")[0]?.textContent || '0';
                const vINSSText = node.getElementsByTagName("ValorInss")[0]?.textContent || node.getElementsByTagName("vINSS")[0]?.textContent || '0';
                const vIRText = node.getElementsByTagName("ValorIr")[0]?.textContent || node.getElementsByTagName("vIRFF")[0]?.textContent || '0';
                const vCSLLText = node.getElementsByTagName("ValorCsll")[0]?.textContent || node.getElementsByTagName("vCSLL")[0]?.textContent || '0';

                const iss = parseFloat(vISSQNText) || 0;
                const pis = parseFloat(vPISText) || 0;
                const cofins = parseFloat(vCOFINSText) || 0;
                const inss = parseFloat(vINSSText) || 0;
                const ir = parseFloat(vIRText) || 0;
                const csll = parseFloat(vCSLLText) || 0;
                
                const totalTributos = iss + pis + cofins + inss + ir + csll;

                if (numero) {
                    const isExit = currentCompanyCnpj && prestadorCnpj.replace(/\D/g, '') === currentCompanyCnpj.replace(/\D/g, '');
                    
                    parsedNotes.push({
                        number: numero,
                        date: dataEmissao || new Date().toISOString(),
                        value: valor,
                        taxValue: totalTributos,
                        type: 'service',
                        status: 'finalizado',
                        entityId: `gerado_${Math.random().toString(36).substr(2, 9)}`,
                        entityName: isExit ? (tomadorNome || 'Tomador (NFSe)') : (prestadorNome || 'Prestador (NFSe)'),
                        cnpj: isExit ? tomadorCnpj : prestadorCnpj,
                        xmlContent: new XMLSerializer().serializeToString(node),
                        details: `Importado via XML: NFSe. ISS: ${iss} | PIS: ${pis} | COFINS: ${cofins} | IR: ${ir}`,
                    });
                }
            }
            return parsedNotes;
        }

        // ======= TIPO 2: Padrão NFe (Modelo 55 ou 65) =======
        const nfeNodes = xmlDoc.getElementsByTagName("NFe");
        if (nfeNodes.length > 0) {
            for (let i = 0; i < nfeNodes.length; i++) {
                const node = nfeNodes[i];
                const infNFe = node.getElementsByTagName("infNFe")[0];
                if (!infNFe) continue;

                const ide = infNFe.getElementsByTagName("ide")[0];
                const emit = infNFe.getElementsByTagName("emit")[0];
                const dest = infNFe.getElementsByTagName("dest")[0];
                const total = infNFe.getElementsByTagName("total")[0];

                const numero = ide?.getElementsByTagName("nNF")[0]?.textContent;
                const dataEmissao = ide?.getElementsByTagName("dhEmi")[0]?.textContent;
                const tpNF = ide?.getElementsByTagName("tpNF")[0]?.textContent; // 0=entrada, 1=saída

                const vNF = total?.getElementsByTagName("vNF")[0]?.textContent || '0';
                
                const emitNome = emit?.getElementsByTagName("xNome")[0]?.textContent;
                const emitCnpj = emit?.getElementsByTagName("CNPJ")[0]?.textContent;
                const emitEnder = emit?.getElementsByTagName("enderEmit")[0];
                const emitUF = emitEnder?.getElementsByTagName("UF")[0]?.textContent || '';
                
                const destNome = dest?.getElementsByTagName("xNome")[0]?.textContent;
                const destCnpj = dest?.getElementsByTagName("CNPJ")[0]?.textContent;
                const destEnder = dest?.getElementsByTagName("enderDest")[0];
                const destUF = destEnder?.getElementsByTagName("UF")[0]?.textContent || '';

                // EXTRAÇÃO: Auditoria, NCM, CFOP e DIFAL/ST
                let auditIssues: string[] = [];
                let isDIFALPossible = (emitUF !== destUF) && (emitUF !== '') && (destUF !== '');
                
                const detNodes = infNFe.getElementsByTagName("det");
                for (let d = 0; d < detNodes.length; d++) {
                    const prod = detNodes[d].getElementsByTagName("prod")[0];
                    const cfop = prod?.getElementsByTagName("CFOP")[0]?.textContent || '';
                    
                    // Simple CFOP vs UF Validation
                    if (isDIFALPossible && cfop.startsWith('5')) {
                        auditIssues.push(`Alerta tributário: CFOP Interno (5xxx) usado em operação interestadual (${emitUF} -> ${destUF}).`);
                    }
                    if (!isDIFALPossible && cfop.startsWith('6')) {
                        auditIssues.push(`Alerta tributário: CFOP Interestadual (6xxx) usado em operação interna (${emitUF}).`);
                    }
                }

                // EXTRAÇÃO: Integração Financeira (Faturas/Duplicatas)
                const cobr = infNFe.getElementsByTagName("cobr")[0];
                const dupNodes = cobr ? cobr.getElementsByTagName("dup") : [];
                let financialDetails = '';
                if (dupNodes.length > 0) {
                     financialDetails = `\nFaturas detectadas: ${dupNodes.length}. `;
                     for(let dupIdx=0; dupIdx < dupNodes.length; dupIdx++) {
                         const dVenc = dupNodes[dupIdx].getElementsByTagName("dVenc")[0]?.textContent;
                         const vDup = dupNodes[dupIdx].getElementsByTagName("vDup")[0]?.textContent;
                         financialDetails += `[Venc: ${dVenc} | R$ ${vDup}] `;
                     }
                }

                // IcmsTotal
                const icmsTot = total?.getElementsByTagName("ICMSTot")[0];
                const vICMS = icmsTot?.getElementsByTagName("vICMS")[0]?.textContent || '0';
                const vST = icmsTot?.getElementsByTagName("vST")[0]?.textContent || '0';
                const vPIS = icmsTot?.getElementsByTagName("vPIS")[0]?.textContent || '0';
                const vCOFINS = icmsTot?.getElementsByTagName("vCOFINS")[0]?.textContent || '0';
                
                const taxesTotal = parseFloat(vICMS) + parseFloat(vST) + parseFloat(vPIS) + parseFloat(vCOFINS);

                if (numero) {
                    const isExit = (tpNF === '1');
                    let finalDetails = `Importado via NFe. ICMS: ${vICMS} | ST: ${vST} | PIS: ${vPIS} | Operação: ${isDIFALPossible ? 'Interestadual (Possível DIFAL)' : 'Interna'}`;
                    if (financialDetails) finalDetails += financialDetails;
                    if (auditIssues.length > 0) finalDetails += `\nAuditoria: ${auditIssues.join(' ')}`;

                    parsedNotes.push({
                        number: numero,
                        date: dataEmissao || new Date().toISOString(),
                        value: parseFloat(vNF),
                        taxValue: taxesTotal || 0,
                        type: isExit ? 'exit' : 'entry',
                        status: 'finalizado',
                        entityId: `nfe_${Math.random().toString(36).substr(2, 9)}`,
                        entityName: isExit ? (destNome || 'Destinatário (NFe)') : (emitNome || 'Emitente (NFe)'),
                        cnpj: isExit ? destCnpj : emitCnpj,
                        xmlContent: new XMLSerializer().serializeToString(node),
                        details: finalDetails,
                    });
                }
            }
        }

    } catch (e) {
        console.error("XML Parse error", e);
    }
    
    return parsedNotes;
};
