import { useState } from 'react';
import { Invoice, InvoiceItem, Client, Product, Service } from '../types';
import { unmask, maskCNPJ, maskCEP, maskPhone } from '../utils/formatters';

export const useXMLProcessor = (data: any, addToast: any, handleRemoveXML: (id: string) => void) => {
    
    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    };

    const getTagValue = (parent: Document | Element, tagName: string): string | null => {
        const elements = parent.getElementsByTagName(tagName);
        return elements.length > 0 ? elements[0].textContent : null;
    };

    const findNestedTag = (doc: Document, possibleParents: string[], targetTags: string | string[]): string | null => {
        const tags = Array.isArray(targetTags) ? targetTags : [targetTags];
        for (const parentName of possibleParents) {
            const parents = doc.getElementsByTagName(parentName);
            for (let i = 0; i < parents.length; i++) {
                for (const tag of tags) {
                    const target = parents[i].getElementsByTagName(tag)[0];
                    if (target && target.textContent) return target.textContent;
                }
            }
        }
        return null;
    };

    const autoRegisterClient = (doc: Document, tagContainer: Element | Document, role: 'client' | 'supplier', forceName?: string | null, forceCNPJ?: string | null) => {
        const cnpj = forceCNPJ ||
            getTagValue(tagContainer, "CNPJ") ||
            getTagValue(tagContainer, "Cnpj") ||
            getTagValue(tagContainer, "CPF") ||
            getTagValue(tagContainer, "Cpf");

        const name = forceName ||
            getTagValue(tagContainer, "xNome") ||
            getTagValue(tagContainer, "RazaoSocial") ||
            getTagValue(tagContainer, "Nome") ||
            getTagValue(tagContainer, "NomeFantasia");

        if (!cnpj || !name) return null;

        const cleanCNPJ = unmask(cnpj);
        const existing = data.clients.find((c: any) => unmask(c.cnpj) === cleanCNPJ);
        if (existing) return existing;

        let addressContainer =
            tagContainer.getElementsByTagName("enderEmit")[0] ||
            tagContainer.getElementsByTagName("enderDest")[0] ||
            tagContainer.getElementsByTagName("enderNac")[0] ||
            tagContainer.getElementsByTagName("end")[0] ||
            tagContainer.getElementsByTagName("Endereco")[0] ||
            tagContainer.getElementsByTagName("InfEndereco")[0];

        if (!addressContainer) addressContainer = tagContainer as Element;

        const getField = (tags: string[]) => {
            for (const t of tags) {
                const val = getTagValue(addressContainer, t);
                if (val) return val;
            }
            return null;
        };

        const logradouro = getField(["xLgr", "Endereco", "Logradouro", "Rua"]);
        const nro = getField(["nro", "Numero", "Num"]);
        const bairro = getField(["xBairro", "Bairro", "Distrito"]);
        const mun = getField(["xMun", "Cidade", "Municipio"]);
        const uf = getField(["UF", "Uf", "Estado"]);
        const cep = getField(["CEP", "Cep", "CodPostal"]);

        const contatoNode = tagContainer.getElementsByTagName("Contato")[0] || tagContainer;
        const phone = getTagValue(contatoNode, "fone") || getTagValue(contatoNode, "Telefone") || getTagValue(contatoNode, "DddTelefone");
        const email = getTagValue(contatoNode, "email") || getTagValue(contatoNode, "Email");

        const cityVal = mun || getField(["cMun", "CodigoMunicipio"]) || "";

        const isAddressIncomplete = !logradouro || !cityVal || !uf;

        const newClient: Client = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            fantasyName: name,
            cnpj: maskCNPJ(cnpj),
            type: role,
            email: email || '',
            phone: phone ? maskPhone(phone) : '',
            address: logradouro || '',
            addressNumber: nro || '',
            addressDistrict: bairro || '',
            city: cityVal,
            uf: uf || '',
            zip: cep ? maskCEP(cep) : ''
        };

        data.addClient(newClient);

        if (isAddressIncomplete || !email) {
            data.addAlert({
                id: Math.random().toString(),
                title: `Cadastro Parcial: ${role === 'client' ? 'Cliente' : 'Fornecedor'}`,
                message: `O parceiro ${name} foi importado, mas alguns dados (Endereço/Email) não foram encontrados no XML. Recomenda-se completar o cadastro.`,
                severity: 'low',
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
            });
        }

        return newClient;
    };

    const processXMLFile = async (
        file: { id: string; name: string; originalFile: File },
        autoSave = false,
        validateOnly = false,
        setters?: {
            setFormData: any;
            setItemSearch: any;
            setPartnerSearch: any;
            setIsModalOpen: any;
        }
    ): Promise<{ success: boolean, error?: string }> => {
        const normalize = (val: string | null) => val ? val.replace(/\D/g, '').replace(/^0+/, '').trim() : '';
        const loggedCompanyCNPJ = data.selectedCompany?.cnpj ? unmask(data.selectedCompany.cnpj) : '';

        if (!loggedCompanyCNPJ) {
            const errorMsg = 'Não foi possível identificar a empresa logada para validar o XML. Selecione uma empresa.';
            data.addAlert({
                id: Math.random().toString(),
                title: 'Erro de Configuração',
                message: errorMsg,
                severity: 'high',
                date: new Date().toISOString(),
                isRead: false,
                type: 'system'
            });
            return { success: false, error: errorMsg };
        }

        try {
            const xmlContent = await readFileAsText(file.originalFile);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, "text/xml");

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Arquivo XML inválido ou corrompido.");
            }

            let emitCNPJ: string | null = null;
            let destCNPJ: string | null = null;
            let nNF: string | null = null;
            let serie: string | null = null;
            let vNF: string | null = null;
            let vTotTrib: string | null = null;
            let dhEmi: string | null = null;
            let chNFe: string | null = null;
            let naturezaOperacao = '';
            let isService = false;

            const hasInfNFe = xmlDoc.getElementsByTagName("infNFe").length > 0;
            const hasInfNFSe = xmlDoc.getElementsByTagName("infNFSe").length > 0;
            const hasInfNfse_Mun = xmlDoc.getElementsByTagName("InfNfse").length > 0 || xmlDoc.getElementsByTagName("CompNfse").length > 0;

            isService = hasInfNFSe || hasInfNfse_Mun;

            if (hasInfNFe && !isService) {
                const nfeEmit = xmlDoc.getElementsByTagName("emit")[0];
                const nfeDest = xmlDoc.getElementsByTagName("dest")[0];

                emitCNPJ = nfeEmit ? getTagValue(nfeEmit, "CNPJ") : null;
                destCNPJ = nfeDest ? getTagValue(nfeDest, "CNPJ") : null;
                nNF = getTagValue(xmlDoc, "nNF");
                serie = getTagValue(xmlDoc, "serie");
                vNF = getTagValue(xmlDoc, "vNF");
                vTotTrib = getTagValue(xmlDoc, "vTotTrib") || (xmlDoc.getElementsByTagName("vICMS").length > 0 ? getTagValue(xmlDoc, "vICMS") : "0");
                dhEmi = getTagValue(xmlDoc, "dhEmi");
                chNFe = getTagValue(xmlDoc, "chNFe") || xmlDoc.getElementsByTagName("infNFe")[0]?.getAttribute("Id")?.replace("NFe", "") || null;
                const natOp = getTagValue(xmlDoc, "natOp");
                if (natOp) naturezaOperacao = natOp;
            } else {
                isService = true;

                if (hasInfNFSe) {
                    const emitNode = xmlDoc.getElementsByTagName("emit")[0];
                    emitCNPJ = emitNode ? (getTagValue(emitNode, "CNPJ") || getTagValue(emitNode, "Cnpj") || getTagValue(emitNode, "CPF") || getTagValue(emitNode, "Cpf")) : null;

                    const tomaNode = xmlDoc.getElementsByTagName("toma")[0];
                    destCNPJ = tomaNode ? (getTagValue(tomaNode, "CNPJ") || getTagValue(tomaNode, "Cnpj") || getTagValue(tomaNode, "CPF") || getTagValue(tomaNode, "Cpf")) : null;

                    nNF = getTagValue(xmlDoc, "nNFSe") || getTagValue(xmlDoc, "nDPS");
                    serie = getTagValue(xmlDoc, "serie");
                    vNF = getTagValue(xmlDoc, "vLiq") || "0";
                    dhEmi = getTagValue(xmlDoc, "dhEmi") || getTagValue(xmlDoc, "dhProc");
                    chNFe = xmlDoc.getElementsByTagName("infNFSe")[0]?.getAttribute("Id") || null;

                    const valoresTag = xmlDoc.getElementsByTagName("valores")[0];
                    if (valoresTag) {
                        const vServTag = valoresTag.getElementsByTagName("vServ")[0];
                        if (vServTag) vNF = vServTag.textContent || vNF;
                    }

                } else {
                    emitCNPJ = findNestedTag(xmlDoc, ["PrestadorServico", "Prestador", "IdentificacaoPrestador", "IdentificacaoPrestadorServico"], ["Cnpj", "CNPJ"]);
                    if (!emitCNPJ) emitCNPJ = getTagValue(xmlDoc, "CnpjPrestador") || getTagValue(xmlDoc, "Cnpj") || getTagValue(xmlDoc, "CNPJ") || getTagValue(xmlDoc, "CnpjEmitente");

                    destCNPJ = findNestedTag(xmlDoc, ["TomadorServico", "Tomador", "IdentificacaoTomador", "IdentificacaoTomadorServico"], ["Cnpj", "CNPJ", "CPF", "Cpf"]);
                    if (!destCNPJ) {
                        const tomadorTag = xmlDoc.getElementsByTagName("TomadorServico")[0];
                        if (tomadorTag) destCNPJ = getTagValue(tomadorTag, "Cnpj") || getTagValue(tomadorTag, "CNPJ") || getTagValue(tomadorTag, "CPF") || getTagValue(tomadorTag, "Cpf");
                    }
                    if (!destCNPJ) {
                        destCNPJ = getTagValue(xmlDoc, "CnpjTomador") || getTagValue(xmlDoc, "CNPJ") || getTagValue(xmlDoc, "CPF") || getTagValue(xmlDoc, "Cpf");
                    }
                    if (!destCNPJ) {
                        const infNfse = xmlDoc.getElementsByTagName("InfNfse")[0];
                        if (infNfse) {
                            const tomador = infNfse.getElementsByTagName("Tomador")[0] || infNfse.getElementsByTagName("TomadorServico")[0];
                            if (tomador) destCNPJ = getTagValue(tomador, "Cnpj") || getTagValue(tomador, "CNPJ") || getTagValue(tomador, "CPF") || getTagValue(tomador, "Cpf");
                        }
                    }

                    nNF = getTagValue(xmlDoc, "Numero") || getTagValue(xmlDoc, "NumeroNfse") || getTagValue(xmlDoc, "nNFSe");
                    serie = getTagValue(xmlDoc, "Serie") || getTagValue(xmlDoc, "SerieNfse") || "";
                    vNF = getTagValue(xmlDoc, "ValorServicos") || getTagValue(xmlDoc, "ValorLiquidoNfse") || getTagValue(xmlDoc, "ValorTotalVlr");
                    vTotTrib = getTagValue(xmlDoc, "ValorIss") || getTagValue(xmlDoc, "ValorIssRetido") || "0";
                    dhEmi = getTagValue(xmlDoc, "DataEmissao") || getTagValue(xmlDoc, "dhEmi");
                    chNFe = getTagValue(xmlDoc, "ChaveAcesso") || getTagValue(xmlDoc, "CodigoVerificacao");
                }
            }

            if (!emitCNPJ && !destCNPJ) {
                const allCNPJs = xmlDoc.getElementsByTagName("CNPJ");
                if (allCNPJs.length > 0) emitCNPJ = allCNPJs[0].textContent;
                if (allCNPJs.length > 1) destCNPJ = allCNPJs[1].textContent;

                if (!emitCNPJ && !destCNPJ)
                    throw new Error("Não foi possível identificar CPF/CNPJ. Verifique o layout do XML.");
            }

            let type: 'entry' | 'exit' | 'service' = 'exit';
            let entityCNPJ = '';
            let registeredPartner: Client | undefined | null;

            const cleanEmit = unmask(emitCNPJ || "");
            const cleanDest = unmask(destCNPJ || "");

            const isEmit = cleanEmit === loggedCompanyCNPJ;
            const isDest = cleanDest === loggedCompanyCNPJ;

            if (!isEmit && !isDest) {
                throw new Error(`Esta nota fiscal (${nNF || "S/N"}) não pertence à empresa selecionada. CNPJ Emitente: ${emitCNPJ || 'N/A'}, Destinatário: ${destCNPJ || 'N/A'}.`);
            }

            if (isEmit) {
                type = isService ? 'service' : 'exit';
                entityCNPJ = destCNPJ || '';
                const destContainer = xmlDoc.getElementsByTagName("dest")[0] || xmlDoc.getElementsByTagName("TomadorServico")[0] || xmlDoc.getElementsByTagName("Tomador")[0] || xmlDoc.getElementsByTagName("toma")[0] || xmlDoc;
                registeredPartner = autoRegisterClient(xmlDoc, destContainer, 'client', null, entityCNPJ);
            } else if (isDest) {
                type = 'entry';
                if (isService) type = 'service';

                entityCNPJ = emitCNPJ || '';
                const emitContainer = xmlDoc.getElementsByTagName("emit")[0] || xmlDoc.getElementsByTagName("PrestadorServico")[0] || xmlDoc.getElementsByTagName("Prestador")[0] || xmlDoc;
                registeredPartner = autoRegisterClient(xmlDoc, emitContainer, 'supplier', null, entityCNPJ);
            }

            if (!naturezaOperacao) {
                if (type === 'service') {
                    if (unmask(emitCNPJ || "") === loggedCompanyCNPJ) naturezaOperacao = 'Prestação de Serviço';
                    else naturezaOperacao = 'Tomada de Serviço';
                } else if (type === 'entry') {
                    naturezaOperacao = 'Compra de Mercadoria';
                } else {
                    naturezaOperacao = 'Venda de Mercadoria';
                }
            }

            const numFull = nNF || "S/N";
            const currentCNPJ = unmask(entityCNPJ || "");
            const xmlNumNorm = normalize(nNF);
            const xmlSerieNorm = normalize(serie);

            const alreadyExists = data.invoices.some((inv: any) => {
                if (chNFe && inv.searchKey === chNFe) return true;
                if (inv.searchKey && inv.searchKey === chNFe) return true;

                const savedNumNorm = normalize(inv.number);
                const savedSerieNorm = normalize(inv.serie || "");
                const savedCNPJ = unmask(inv.cnpj || "");

                const samePartner = savedCNPJ === currentCNPJ;
                const sameType = inv.type === type;
                const matchFields = savedNumNorm === xmlNumNorm && savedSerieNorm === xmlSerieNorm;

                return samePartner && sameType && matchFields;
            });

            if (alreadyExists) {
                if (!autoSave && !validateOnly) {
                    addToast(`Nota #${numFull} já está lançada no sistema.`, 'warning');
                    handleRemoveXML(file.id);
                }
                return { success: false, error: 'Nota já cadastrada.' };
            }

            if (validateOnly) return { success: true };

            const extractedItems: InvoiceItem[] = [];

            if (!isService) {
                const dets = xmlDoc.getElementsByTagName("det");
                for (let i = 0; i < dets.length; i++) {
                    const det = dets[i];
                    const prodTag = det.getElementsByTagName("prod")[0];
                    if (prodTag) {
                        const cProd = getTagValue(prodTag, "cProd") || "";
                        const xProd = getTagValue(prodTag, "xProd") || "Produto s/ Descrição";
                        const ncm = getTagValue(prodTag, "NCM") || "";
                        const cfop = getTagValue(prodTag, "CFOP") || "";
                        const uCom = getTagValue(prodTag, "uCom") || "";
                        const qCom = parseFloat(getTagValue(prodTag, "qCom") || "1");
                        const vUnCom = parseFloat(getTagValue(prodTag, "vUnCom") || "0");
                        const vProd = parseFloat(getTagValue(prodTag, "vProd") || "0");
                        const vDesc = parseFloat(getTagValue(prodTag, "vDesc") || "0");

                        const impTag = det.getElementsByTagName("imposto")[0];
                        let cst = "";
                        let bcIcms = 0;
                        let pIcms = 0;
                        let vIcms = 0;
                        let vIpi = 0;
                        let pIpi = 0;
                        let pPis = 0;
                        let vPis = 0;
                        let pCofins = 0;
                        let vCofins = 0;

                        if (impTag) {
                            const icmsTag = impTag.getElementsByTagName("ICMS")[0];
                            if (icmsTag && icmsTag.children.length > 0) {
                                const icmsType = icmsTag.children[0];
                                cst = getTagValue(icmsType, "CST") || getTagValue(icmsType, "CSOSN") || "";
                                bcIcms = parseFloat(getTagValue(icmsType, "vBC") || "0");
                                pIcms = parseFloat(getTagValue(icmsType, "pICMS") || "0");
                                vIcms = parseFloat(getTagValue(icmsType, "vICMS") || "0");
                            }

                            const ipiTag = impTag.getElementsByTagName("IPITrib")[0];
                            if (ipiTag) {
                                pIpi = parseFloat(getTagValue(ipiTag, "pIPI") || "0");
                                vIpi = parseFloat(getTagValue(ipiTag, "vIPI") || "0");
                            }

                            const pisTag = impTag.getElementsByTagName("PIS")[0];
                            if (pisTag && pisTag.children.length > 0) {
                                const pisType = pisTag.children[0];
                                pPis = parseFloat(getTagValue(pisType, "pPIS") || "0");
                                vPis = parseFloat(getTagValue(pisType, "vPIS") || "0");
                            }

                            const cofinsTag = impTag.getElementsByTagName("COFINS")[0];
                            if (cofinsTag && cofinsTag.children.length > 0) {
                                const cofinsType = cofinsTag.children[0];
                                pCofins = parseFloat(getTagValue(cofinsType, "pCOFINS") || "0");
                                vCofins = parseFloat(getTagValue(cofinsType, "vCOFINS") || "0");
                            }
                        }

                        const matchedProduct = data.products.find((p: any) => p.code === cProd);

                        extractedItems.push({
                            productId: matchedProduct?.id || 'manual',
                            code: cProd,
                            description: xProd,
                            ncm,
                            cst,
                            cfop,
                            unit: uCom,
                            quantity: qCom,
                            unitPrice: vUnCom,
                            total: vProd,
                            discount: vDesc,
                            bcIcms,
                            vIcms,
                            pIcms,
                            vIpi,
                            pIpi,
                            pPis,
                            vPis,
                            pCofins,
                            vCofins
                        });
                    }
                }
            } else {
                let itemCode = "";
                let desc = "";
                let vServItem = parseFloat(vNF || "0");
                let vIssItem = parseFloat(vTotTrib || "0");
                let pIssItem = 0;
                let vPisItem = 0;
                let vCofinsItem = 0;
                let vInssItem = 0;
                let vIrItem = 0;
                let vCsllItem = 0;

                const companyIssRate = Number(data.selectedCompany?.aliquotaISS) || 0;

                if (hasInfNFSe) {
                    const servTag = xmlDoc.getElementsByTagName("serv")[0];
                    if (servTag) {
                        const cServ = servTag.getElementsByTagName("cServ")[0];
                        if (cServ) {
                            itemCode = getTagValue(cServ, "cTribNac") || getTagValue(cServ, "xDescServ") || "";
                            desc = getTagValue(cServ, "xDescServ") || "Serviço Nacional";
                        } else {
                            desc = "Serviço Nacional (Genérico)";
                        }
                    } else {
                        itemCode = getTagValue(xmlDoc, "cTribNac") || "";
                        desc = getTagValue(xmlDoc, "xDescServ") || "Serviço";
                    }

                    pIssItem = companyIssRate;
                    if (vIssItem === 0 && pIssItem > 0) {
                        vIssItem = Number((vServItem * pIssItem / 100).toFixed(2));
                    }
                } else {
                    let servicoNode = xmlDoc.getElementsByTagName("Servico")[0];
                    if (!servicoNode) {
                        const allServs = xmlDoc.getElementsByTagName("Servico");
                        if (allServs.length > 0) servicoNode = allServs[allServs.length - 1];
                    }

                    if (servicoNode) {
                        itemCode = getTagValue(servicoNode, "ItemListaServico") || getTagValue(servicoNode, "CodigoTributacaoMunicipio") || "";
                        desc = getTagValue(servicoNode, "Discriminacao") || "Serviço ABRASF";

                        const valoresNode = servicoNode.getElementsByTagName("Valores")[0];
                        if (valoresNode) {
                            vServItem = parseFloat(getTagValue(valoresNode, "ValorServicos") || (vNF || "0"));
                            vIssItem = parseFloat(getTagValue(valoresNode, "ValorIss") || "0");
                            
                            let aliq = parseFloat(getTagValue(valoresNode, "Aliquota") || "0");
                            if (aliq < 1 && aliq > 0) {
                                aliq = aliq * 100;
                            }
                            pIssItem = aliq || companyIssRate;

                            if (vIssItem === 0 && pIssItem > 0) {
                                vIssItem = Number((vServItem * pIssItem / 100).toFixed(2));
                            }

                            vPisItem = parseFloat(getTagValue(valoresNode, "ValorPis") || "0");
                            vCofinsItem = parseFloat(getTagValue(valoresNode, "ValorCofins") || "0");
                            vInssItem = parseFloat(getTagValue(valoresNode, "ValorInss") || "0");
                            vIrItem = parseFloat(getTagValue(valoresNode, "ValorIr") || "0");
                            vCsllItem = parseFloat(getTagValue(valoresNode, "ValorCsll") || "0");
                        }
                    } else {
                        desc = getTagValue(xmlDoc, "Discriminacao") || "Serviço";
                        itemCode = getTagValue(xmlDoc, "ItemListaServico") || "";
                        pIssItem = companyIssRate;
                        if (vIssItem === 0 && pIssItem > 0) {
                            vIssItem = Number((vServItem * pIssItem / 100).toFixed(2));
                        }
                    }
                }

                const matchedService = data.services.find((s: any) => s.serviceItem === itemCode) ||
                    data.services.find((s: any) => s.code === itemCode) ||
                    data.services.find((s: any) => desc.toUpperCase().includes(s.name.toUpperCase()));

                extractedItems.push({
                    productId: matchedService?.id || 'manual',
                    code: itemCode,
                    description: desc.substring(0, 500),
                    quantity: 1,
                    unitPrice: vServItem,
                    total: vServItem,
                    vIss: vIssItem,
                    pIss: pIssItem,
                    vPis: vPisItem,
                    vCofins: vCofinsItem,
                    vCsll: vCsllItem,
                    vIrrf: vIrItem,
                    vInss: vInssItem,
                    pPis: vServItem > 0 ? Number(((vPisItem / vServItem) * 100).toFixed(2)) : 0,
                    pCofins: vServItem > 0 ? Number(((vCofinsItem / vServItem) * 100).toFixed(2)) : 0,
                    pCsll: vServItem > 0 ? Number(((vCsllItem / vServItem) * 100).toFixed(2)) : 0,
                    pIrrf: vServItem > 0 ? Number(((vIrItem / vServItem) * 100).toFixed(2)) : 0,
                    pInss: vServItem > 0 ? Number(((vInssItem / vServItem) * 100).toFixed(2)) : 0,
                });
            }

            const vNFNum = parseFloat(vNF || "0");

            const sumTaxes = extractedItems.reduce((acc, item) => ({
                icms: acc.icms + (item.vIcms || 0),
                ipi: acc.ipi + (item.vIpi || 0),
                iss: acc.iss + (item.vIss || 0),
                pis: acc.pis + (item.vPis || 0),
                cofins: acc.cofins + (item.vCofins || 0),
                csll: acc.csll + (item.vCsll || 0),
                irrf: acc.irrf + (item.vIrrf || 0),
                inss: acc.inss + (item.vInss || 0),
                aliqIcms: acc.aliqIcms || (item.pIcms || 0),
                aliqIpi: acc.aliqIpi || (item.pIpi || 0),
                aliqIss: acc.aliqIss || (item.pIss || 0),
                aliqPis: acc.aliqPis || (item.pPis || 0),
                aliqCofins: acc.aliqCofins || (item.pCofins || 0)
            }), { icms: 0, ipi: 0, iss: 0, pis: 0, cofins: 0, csll: 0, irrf: 0, inss: 0, aliqIcms: 0, aliqIpi: 0, aliqIss: 0, aliqPis: 0, aliqCofins: 0 });

            if (autoSave) {
                const newInvoice: Invoice = {
                    id: Math.random().toString(36).substr(2, 9),
                    number: nNF || "S/N",
                    serie: serie || "",
                    searchKey: chNFe || "",
                    entityId: registeredPartner ? registeredPartner.id : 'xml-import',
                    entityName: registeredPartner?.name || "Entidade Externa",
                    cnpj: maskCNPJ(entityCNPJ || "00000000000"),
                    date: dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0],
                    value: vNFNum,
                    taxValue: (sumTaxes.icms + sumTaxes.ipi + sumTaxes.iss + sumTaxes.pis + sumTaxes.cofins),
                    status: 'autorizada',
                    type: type,
                    naturezaOperacao: naturezaOperacao,
                    items: extractedItems,
                    xmlContent: xmlContent,
                    accessKey: chNFe || ""
                };
                await data.addInvoice(newInvoice);
                handleRemoveXML(file.id);
            } else if (setters) {
                setters.setFormData((prev: any) => ({
                    ...prev,
                    id: '',
                    tipoNota: type,
                    naturezaOperacao: naturezaOperacao,
                    status: 'autorizada',
                    numero: nNF || '',
                    serie: serie || '',
                    searchKey: chNFe || '',
                    accessKey: chNFe || '',
                    dataEmissao: dhEmi ? dhEmi.split('T')[0] : new Date().toISOString().split('T')[0],
                    entityId: registeredPartner?.id || '',
                    totalNota: vNFNum,
                    totalImpostos: parseFloat(vTotTrib || "0") || (sumTaxes.icms + sumTaxes.ipi + sumTaxes.iss),
                    items: extractedItems,
                    totalProdutos: vNFNum,
                    xmlContent: xmlContent,
                    impostoICMSValor: sumTaxes.icms,
                    impostoICMSAliq: sumTaxes.aliqIcms,
                    impostoIPIValor: sumTaxes.ipi,
                    impostoIPIAliq: sumTaxes.aliqIpi,
                    impostoISSValor: sumTaxes.iss,
                    impostoISSAliq: sumTaxes.aliqIss,
                    impostoPISValor: sumTaxes.pis,
                    impostoPISAliq: sumTaxes.aliqPis,
                    impostoCOFINSValor: sumTaxes.cofins,
                    impostoCOFINSAliq: sumTaxes.aliqCofins,
                    impostoCSLLValor: sumTaxes.csll,
                    impostoIRRFValor: sumTaxes.irrf,
                    impostoINSSValor: sumTaxes.inss,
                    pendingFileId: file.id,
                    ...(extractedItems.length > 0 ? {
                        prodId: extractedItems[0].productId,
                        prodQtd: extractedItems[0].quantity,
                        prodVlrUnit: extractedItems[0].unitPrice,
                        prodVlrTotal: extractedItems[0].total
                    } : {})
                }));

                if (extractedItems.length > 0) setters.setItemSearch(extractedItems[0].description);
                if (registeredPartner) setters.setPartnerSearch(registeredPartner.name);
                setters.setIsModalOpen(true);
                addToast('Dados do XML carregados no formulário.', 'success');
            }

            return { success: true };

        } catch (error) {
            const errorMsg = (error as Error).message;
            console.error(`Erro ao processar ${file.name}:`, error);

            if (!validateOnly) {
                data.addAlert({
                    id: Math.random().toString(),
                    title: 'Erro de Importação XML',
                    message: `Falha ao processar ${file.name}: ${errorMsg}.`,
                    severity: 'medium',
                    date: new Date().toISOString(),
                    isRead: false,
                    type: 'system'
                });
            }
            return { success: false, error: errorMsg };
        }
    };

    return { processXMLFile };
};
