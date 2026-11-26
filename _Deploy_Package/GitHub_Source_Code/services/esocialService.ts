
import { CompanyEntity, EsocialEvent } from '../types';

// ==========================================
// SERVIÇO DE COMUNICAÇÃO (Via Proxy Backend)
// ==========================================

// Usando 127.0.0.1 para evitar ambiguidades de DNS no Windows
const ESOCIAL_PROXY_URL = 'http://127.0.0.1:3000/api/esocial';

// Interface para resposta do serviço
export interface EsocialResponse {
    success: boolean;
    protocol?: string;
    receipt?: string;
    errorType?: 'connection' | 'validation' | 'server';
    message: string;
    xmlResponse?: string;
}

export interface CertData {
    name: string;
    expiry: string;
    pfxBase64?: string;
    password?: string;
}

export class EsocialService {
    private certificate: CertData | null = null;
    private environment: 'production' | 'staging';

    constructor(env: 'production' | 'staging' = 'production') {
        this.environment = env;
    }

    public setCertificate(certData: CertData) {
        this.certificate = certData;
    }

    /**
     * Monta o envelope SOAP e envia o lote para o eSocial
     */
    // Mapeamento de Eventos para Tags XML (Raiz do Evento)
    public getEventTag(evtType: string): string {
        const map: Record<string, string> = {
            'S-1000': 'evtInfoEmpregador',
            'S-1005': 'evtTabEstab',
            'S-1010': 'evtTabRubrica',
            'S-1200': 'evtRemun',
            'S-1210': 'evtPgtos',
            'S-1299': 'evtFechaEvPer',
            'S-2190': 'evtAdmPrelim',
            'S-2200': 'evtAdmissao',
            'S-2205': 'evtAltCadastral',
            'S-2206': 'evtAltContratual',
            'S-2210': 'evtCAT',
            'S-2220': 'evtMonit',
            'S-2240': 'evtCondAmb',
            'S-2299': 'evtDeslig',
            'S-2300': 'evtTSVInicio',
            'S-3000': 'evtExclusao'
        };
        return map[evtType] || '';
    }

    /**
     * Assina individualmente cada evento e envia o lote
     */
    public async sendBatch(company: CompanyEntity, events: EsocialEvent[]): Promise<EsocialResponse> {
        if (!this.certificate || !this.certificate.pfxBase64) {
            return { success: false, message: 'Certificado digital não carregado (PFX obrigatório).', errorType: 'validation' };
        }

        try {
            // 1. Assinar Eventos Individualmente
            const signedEvents: EsocialEvent[] = [];

            for (const evt of events) {
                // Se já estiver assinado ou com erro, pula ou mantém
                if (evt.status === 'error') {
                    console.warn(`Pulando evento com erro: ${evt.evtType}`);
                    continue; // Não envia evento com erro de validação prévia
                }

                // CHECK: Se já está assinado, usa o XML existente
                if (evt.status === 'signed' && evt.xml.includes('Signature')) {
                    signedEvents.push(evt);
                    continue;
                }

                const tagToSign = this.getEventTag(evt.evtType);
                if (!tagToSign) {
                    // Fallback ou erro se tipo desconhecido
                    console.warn(`Tag desconhecida para ${evt.evtType}, tentando envio sem assinatura nova.`);
                    signedEvents.push(evt);
                    continue;
                }

                console.log(`Assinando evento ${evt.evtType} (${evt.id})...`);
                const signedXml = await this.signEvent(evt.xml, tagToSign);

                signedEvents.push({
                    ...evt,
                    xml: signedXml,
                    status: 'signed'
                });
            }

            if (signedEvents.length === 0) {
                return { success: false, message: 'Nenhum evento válido para envio.', errorType: 'validation' };
            }

            // 2. Montar Lote XML (Agora com eventos assinados)
            const batchXml = this.buildBatchXml(company, signedEvents);

            // 3. Montar Envelope SOAP
            const soapEnvelope = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esoc="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
                <soapenv:Header/>
                <soapenv:Body>
                    <esoc:EnviarLoteEventos>
                        <esoc:loteEventos>
                            ${batchXml}
                        </esoc:loteEventos>
                    </esoc:EnviarLoteEventos>
                </soapenv:Body>
            </soapenv:Envelope>`;

            console.log(`Enviando Lote para Proxy (${this.environment})... Qtd Eventos: ${signedEvents.length}`);

            // CHAMADA AO PROXY (SEND)
            const response = await fetch(`${ESOCIAL_PROXY_URL}/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    xml: soapEnvelope,
                    pfx: this.certificate.pfxBase64,
                    password: this.certificate.password || '', // Senha enviada ao proxy
                    env: this.environment
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    message: `Erro Proxy ${response.status}: ${errorText}`,
                    errorType: 'connection'
                };
            }

            const textResponse = await response.text();
            console.log('Resposta do eSocial via Proxy:', textResponse);

            // Parse Simples do XML de Resposta
            const protocolMatch = textResponse.match(/<protocoloEnvio>(.*?)<\/protocoloEnvio>/);
            const errorMatch = textResponse.match(/<mensagem>(.*?)<\/mensagem>/);

            if (protocolMatch && protocolMatch[1]) {
                return {
                    success: true,
                    protocol: protocolMatch[1],
                    message: 'Lote recebido com sucesso. Aguardando processamento.',
                    xmlResponse: textResponse
                };
            } else if (errorMatch) {
                return {
                    success: false,
                    message: `Erro retornado pelo eSocial: ${errorMatch[1]}`,
                    errorType: 'validation',
                    xmlResponse: textResponse
                };
            }

            return {
                success: false,
                message: 'Resposta recebida, mas formato desconhecido.',
                errorType: 'server',
                xmlResponse: textResponse
            };

        } catch (error: any) {
            console.error('Erro no processo de envio:', error);
            if (error.message && error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    message: 'Não foi possível conectar ao Proxy Local (http://127.0.0.1:3000). Verifique se "proxy-server.js" está rodando.',
                    errorType: 'connection'
                };
            }
            return {
                success: false,
                message: `Erro interno: ${error.message}`,
                errorType: 'connection'
            };
        }
    }

    /**
     * Chama o Proxy para assinar um único evento XML
     */
    public async signEvent(xml: string, tagToSign: string): Promise<string> {
        if (!this.certificate) throw new Error('Certificado não carregado.');

        const response = await fetch(`${ESOCIAL_PROXY_URL.replace('/esocial', '')}/sign`, { // /api/sign
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                xml,
                pfx: this.certificate.pfxBase64,
                password: this.certificate.password || '',
                tagToSign
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
            throw new Error(`Falha na assinatura: ${err.message || response.statusText}`);
        }

        const data = await response.json();
        if (!data.success || !data.signedXml) {
            throw new Error(data.message || 'Erro ao assinar XML (resposta inválida).');
        }

        return data.signedXml;
    }

    /**
     * Assina uma lista de eventos e retorna as versões assinadas
     */
    public async signEvents(events: EsocialEvent[]): Promise<EsocialEvent[]> {
        const signedList: EsocialEvent[] = [];
        for (const evt of events) {
            try {
                const tag = this.getEventTag(evt.evtType);
                if (!tag) {
                    console.warn(`Tag desconhecida para ${evt.evtType}`);
                    signedList.push(evt);
                    continue;
                }
                const sXml = await this.signEvent(evt.xml, tag);
                signedList.push({ ...evt, xml: sXml, status: 'signed' });
            } catch (err) {
                console.error(`Erro ao assinar ${evt.evtType}:`, err);
                // Matém status original ou error?
                signedList.push({ ...evt, status: 'error', validationMessage: (err as any).message });
            }
        }
        return signedList;
    }

    /**
     * Consulta o processamento de um lote enviado
     */
    public async checkResults(protocol: string): Promise<EsocialResponse> {
        if (!this.certificate || !this.certificate.pfxBase64) {
            return { success: false, message: 'Certificado necessário para consulta.', errorType: 'validation' };
        }

        const soapEnvelope = `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:esoc="http://www.esocial.gov.br/schema/lote/eventos/consulta/v1_1_0">
                <soapenv:Header/>
                <soapenv:Body>
                    <esoc:ConsultarLoteEventos>
                        <esoc:consulta>
                            <esoc:protocoloEnvio>${protocol}</esoc:protocoloEnvio>
                        </esoc:consulta>
                    </esoc:ConsultarLoteEventos>
                </soapenv:Body>
            </soapenv:Envelope>`;

        try {
            console.log(`Consultando via Proxy: ${protocol}`);

            const response = await fetch(`${ESOCIAL_PROXY_URL}/consult`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    xml: soapEnvelope,
                    pfx: this.certificate.pfxBase64,
                    password: this.certificate.password || '',
                    env: this.environment
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return {
                    success: false,
                    message: `Erro Proxy ${response.status}: ${errorText}`,
                    errorType: 'connection'
                };
            }

            const textResponse = await response.text();

            // Parse Regex
            const receiptMatch = textResponse.match(/<nrRecibo>(.*?)<\/nrRecibo>/);
            const errorMatch = textResponse.match(/<mensagem>(.*?)<\/mensagem>/);
            const errorCodeMatch = textResponse.match(/<codigo>(.*?)<\/codigo>/);

            if (receiptMatch && receiptMatch[1]) {
                return {
                    success: true,
                    receipt: receiptMatch[1],
                    message: 'Lote processado com sucesso.',
                    xmlResponse: textResponse
                };
            } else if (errorMatch) {
                const code = errorCodeMatch ? errorCodeMatch[1] : 'Erro';
                return {
                    success: false,
                    message: `Erro ${code}: ${errorMatch[1]}`,
                    errorType: 'validation',
                    xmlResponse: textResponse
                };
            }

            return {
                success: false,
                message: 'Consulta realizada, mas sem recibo ou erro claro identificado.',
                errorType: 'server',
                xmlResponse: textResponse
            };

        } catch (error: any) {
            console.error('Erro de conexão:', error);
            if (error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    message: 'Proxy desconectado. Inicie o servidor local.',
                    errorType: 'connection'
                };
            }
            return { success: false, message: error.message, errorType: 'connection' };
        }
    }

    // --- MÉTODOS AUXILIARES ---

    private buildBatchXml(company: CompanyEntity, events: EsocialEvent[]): string {
        return `
            <eSocial xmlns="http://www.esocial.gov.br/schema/lote/eventos/envio/v1_1_1">
                <envioLoteEventos grupo="1">
                    <ideEmpregador>
                        <tpInsc>1</tpInsc>
                        <nrInsc>${company.cnpj.replace(/\D/g, '')}</nrInsc>
                    </ideEmpregador>
                    <ideTransmissor>
                        <tpInsc>1</tpInsc>
                        <nrInsc>${company.cnpj.replace(/\D/g, '')}</nrInsc>
                    </ideTransmissor>
                    <eventos>
                        ${events.map(e => `<evento Id="${e.id}">${e.xml}</evento>`).join('')}
                    </eventos>
                </envioLoteEventos>
            </eSocial>
        `;
    }

    private async signXml(xml: string): Promise<string> {
        // XMLDSig ainda não implementado no frontend nem no proxy simples.
        // O eSocial vai retornar erro de "Assinatura Inválida", mas conexão funcionará.
        return xml;
    }
}

export const esocialService = new EsocialService();
