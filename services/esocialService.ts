
import { CompanyEntity, EsocialEvent } from '../types';

// ==========================================
// SERVIÇO DE COMUNICAÇÃO (Via Proxy Backend)
// ==========================================

const ESOCIAL_PROXY_URL = 'http://127.0.0.1:3000/api/esocial';

const ESOCIAL_URLS = {
    production: {
        send: 'https://webservices.envio.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
        retrieve: 'https://webservices.consulta.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    },
    staging: {
        send: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/enviarloteeventos/WsEnviarLoteEventos.svc',
        retrieve: 'https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultarloteeventos/WsConsultarLoteEventos.svc'
    }
};

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
    thumbprint?: string; // Fingerprint for system certs
    isSerpro?: boolean;  // Flag for Serpro Signer
    type?: 'file' | 'system' | 'serpro';
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
        if (!this.certificate) {
            return { success: false, message: 'Certificado digital não carregado.', errorType: 'validation' };
        }

        try {
            // 1. Assinar Eventos Individualmente
            const signedEvents: EsocialEvent[] = [];

            for (const evt of events) {
                if (evt.status === 'error') continue;

                if (evt.status === 'signed' && evt.xml.includes('Signature')) {
                    signedEvents.push(evt);
                    continue;
                }

                const tagToSign = this.getEventTag(evt.evtType);
                if (!tagToSign) {
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

            const targetEnv = this.environment === 'production' ? 'production' : 'staging';
            const url = ESOCIAL_URLS[targetEnv].send;

            // 4. Enviar (Proxy vs Direct via Electron)
            if (this.certificate.type === 'file' && this.certificate.pfxBase64) {
                // Via Proxy (Legacy/File)
                console.log(`Enviando Lote para Proxy... Qtd Eventos: ${signedEvents.length}`);
                const response = await fetch(`${ESOCIAL_PROXY_URL}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        xml: soapEnvelope,
                        pfx: this.certificate.pfxBase64,
                        password: this.certificate.password || '',
                        env: this.environment
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return { success: false, message: `Erro Proxy ${response.status}: ${errorText}`, errorType: 'connection' };
                }

                const textResponse = await response.text();
                return this.parseEsocialResponse(textResponse);
            } else if (this.certificate.thumbprint || this.certificate.isSerpro) {
                // Via Electron Direct (Para Certificados do Sistema/A3)
                console.log(`Enviando Lote via Electron (Direct mTLS)... Qtd Eventos: ${signedEvents.length}`);
                const electronAPI = (window as any).electronAPI;

                if (!electronAPI || !electronAPI.secureRequest) {
                    throw new Error('Ambiente Electron não disponível para envio direto.');
                }

                const response = await electronAPI.secureRequest({
                    url: url,
                    method: 'POST',
                    data: soapEnvelope,
                    headers: {
                        'Content-Type': 'text/xml; charset=utf-8',
                        'SOAPAction': 'http://www.esocial.gov.br/services/empregador/enviarloteeventos/v1_1_1/EnviarLoteEventos'
                    },
                    thumbprint: this.certificate.thumbprint
                });

                if (response.error) {
                    return { success: false, message: `Erro mTLS Direct: ${response.error}`, errorType: 'connection' };
                }

                return this.parseEsocialResponse(response.data);
            }

            return { success: false, message: 'Método de envio não suportado para este certificado.', errorType: 'validation' };

        } catch (error: any) {
            console.error('Erro no processo de envio:', error);
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

        const electronAPI = (window as any).electronAPI;
        if (!electronAPI) throw new Error('Ambiente de execução não suporta assinatura digital nativa.');

        // 1. Serpro Signer Integration
        if (this.certificate.isSerpro) {
            const result = await electronAPI.signWithSerpro({ xml, tagToSign });
            if (result.success && result.signedXml) return result.signedXml;
            throw new Error(result.message || 'Erro ao assinar com Serpro Assinador.');
        }

        // 2. System Certificate (Thumbprint) Integration
        if (this.certificate.thumbprint) {
            // Call thumbprint-based signing (requires implementation in main process or via C# helper)
            // For now, let's assume we implement a native signing route for thumbprints too
            const result = await electronAPI.signXml({
                xml,
                tagToSign,
                thumbprint: this.certificate.thumbprint
            });

            if (result.success && result.signedXml) return result.signedXml;
            throw new Error(result.message || 'Erro ao assinar com certificado do sistema.');
        }

        // 3. Traditional PFX File
        if (this.certificate.pfxBase64) {
            const result = await electronAPI.signXml({
                xml,
                pfx: this.certificate.pfxBase64,
                password: this.certificate.password || '',
                tagToSign
            });

            if (result.success && result.signedXml) return result.signedXml;
            throw new Error(result.message || 'Erro ao assinar XML (Electron PFX).');
        }

        throw new Error('Tipo de certificado não suportado para assinatura.');
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
        if (!this.certificate) {
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
            const targetEnv = this.environment === 'production' ? 'production' : 'staging';
            const url = ESOCIAL_URLS[targetEnv].retrieve;

            if (this.certificate.type === 'file' && this.certificate.pfxBase64) {
                const response = await fetch(`${ESOCIAL_PROXY_URL}/consult`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        xml: soapEnvelope,
                        pfx: this.certificate.pfxBase64,
                        password: this.certificate.password || '',
                        env: this.environment
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    return { success: false, message: `Erro Proxy ${response.status}: ${errorText}`, errorType: 'connection' };
                }

                const textResponse = await response.text();
                return this.parseEsocialResponse(textResponse);
            } else if (this.certificate.thumbprint || this.certificate.isSerpro) {
                const electronAPI = (window as any).electronAPI;
                const response = await electronAPI.secureRequest({
                    url: url,
                    method: 'POST',
                    data: soapEnvelope,
                    headers: {
                        'Content-Type': 'text/xml; charset=utf-8',
                        'SOAPAction': '"http://www.esocial.gov.br/services/empregador/consultarloteeventos/v1_1_0/ConsultarLoteEventos"'
                    },
                    thumbprint: this.certificate.thumbprint
                });

                if (response.error) {
                    return { success: false, message: `Erro Direct mTLS: ${response.error}`, errorType: 'connection' };
                }

                return this.parseEsocialResponse(response.data);
            }

            return { success: false, message: 'Certificado não suportado para consulta.', errorType: 'validation' };
        } catch (error: any) {
            return { success: false, message: error.message, errorType: 'connection' };
        }
    }

    private parseEsocialResponse(textResponse: string): EsocialResponse {
        const protocolMatch = textResponse.match(/<protocoloEnvio>(.*?)<\/protocoloEnvio>/);
        const receiptMatch = textResponse.match(/<nrRecibo>(.*?)<\/nrRecibo>/);
        const errorMatch = textResponse.match(/<mensagem>(.*?)<\/mensagem>/);

        if (protocolMatch && protocolMatch[1]) {
            return { success: true, protocol: protocolMatch[1], message: 'Lote recebido com sucesso.', xmlResponse: textResponse };
        }
        if (receiptMatch && receiptMatch[1]) {
            return { success: true, receipt: receiptMatch[1], message: 'Lote processado com sucesso.', xmlResponse: textResponse };
        }
        if (errorMatch) {
            return { success: false, message: `eSocial: ${errorMatch[1]}`, errorType: 'validation', xmlResponse: textResponse };
        }

        return { success: false, message: 'Resposta desconhecida.', errorType: 'server', xmlResponse: textResponse };
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
