import { ipcMain } from 'electron';
import crypto from 'crypto';
import forge from 'node-forge';

/**
 * Calcula o Hash SHA-256 de uma string
 */
const calculateHash = (content: string) => {
    return crypto.createHash('sha256').update(content, 'utf8').digest('base64');
};

/**
 * Assina um conteúdo usando RSA-SHA256 e a chave privada PEM
 */
const signContent = (content: string, privateKeyPem: string) => {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(content);
    return signer.sign(privateKeyPem, 'base64');
};

/**
 * Canonicalização Simplificada (C14N) para eSocial
 */
const c14n = (xml: string) => {
    let clean = xml.replace(/<\?xml.*?\?>/g, '');
    clean = clean.replace(/>\s+</g, '><');
    return clean.trim();
};

/**
 * Extrai Chave Privada e Certificado do PFX
 */
const extractCertData = (pfxBase64: string, password: string) => {
    const pfxDer = forge.util.decode64(pfxBase64);
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);

    let keyPem: string | null = null;
    let certPem: string | null = null;

    // Extrair Certificado
    const certBags = pfx.getBags({ bagType: forge.pki.oids.certBag })?.[forge.pki.oids.certBag];
    if (certBags && certBags.length > 0) {
        certPem = forge.pki.certificateToPem(certBags[0].cert!);
    }

    // Extrair Chave Privada
    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })?.[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (keyBags && keyBags.length > 0) {
        keyPem = forge.pki.privateKeyToPem(keyBags[0].key!);
    } else {
        const plainKeyBags = pfx.getBags({ bagType: forge.pki.oids.keyBag })?.[forge.pki.oids.keyBag];
        if (plainKeyBags && plainKeyBags.length > 0) {
            keyPem = forge.pki.privateKeyToPem(plainKeyBags[0].key!);
        }
    }

    const cleanCert = certPem ? certPem.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\r\n/g, '').replace(/\n/g, '') : null;

    return { keyPem, certPem, cleanCert };
};

export const registerSigner = () => {
    ipcMain.handle('sign-xml', async (_, { xml, pfx, password, tagToSign, thumbprint }: { xml: string, pfx?: string, password?: string, tagToSign: string, thumbprint?: string }) => {
        try {
            console.log('[Signer] Assinando XML:', tagToSign, thumbprint ? `via Store (${thumbprint})` : 'via PFX');

            if (!xml || !tagToSign) {
                throw new Error('Dados incompletos para assinatura.');
            }

            // --- CASO 1: ASSINATURA VIA WINDOWS STORE (THUMBPRINT) ---
            if (thumbprint) {
                const { execSync } = require('child_process');

                // Script PowerShell para assinar XML usando SignedXml do .NET
                // Este script é balanceado para ser passado via CLI
                const psScript = `
                    Add-Type -AssemblyName "System.Security, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a"
                    $xmlDoc = New-Object System.Xml.XmlDocument
                    $xmlDoc.PreserveWhitespace = $true
                    $xmlDoc.LoadXml(@'
${xml.replace(/'/g, "''")}
'@)
                    $cert = Get-Item "Cert:\\CurrentUser\\My\\${thumbprint}"
                    if (!$cert) { throw "Certificado nao encontrado: ${thumbprint}" }

                    $signedXml = New-Object System.Security.Cryptography.Xml.SignedXml($xmlDoc)
                    $signedXml.SigningKey = $cert.PrivateKey

                    $reference = New-Object System.Security.Cryptography.Xml.Reference
                    $reference.Uri = "#" + $xmlDoc.GetElementsByTagName("${tagToSign}")[0].Attributes["Id"].Value
                    
                    $envTransform = New-Object System.Security.Cryptography.Xml.XmlDsigEnvelopedSignatureTransform
                    $reference.AddTransform($envTransform)
                    
                    $c14nTransform = New-Object System.Security.Cryptography.Xml.XmlDsigC14NTransform
                    $reference.AddTransform($c14nTransform)

                    $signedXml.AddReference($reference)

                    $keyInfo = New-Object System.Security.Cryptography.Xml.KeyInfo
                    $x509Data = New-Object System.Security.Cryptography.Xml.KeyInfoX509Data($cert)
                    $keyInfo.AddClause($x509Data)
                    $signedXml.KeyInfo = $keyInfo

                    $signedXml.ComputeSignature()
                    $signatureXml = $signedXml.GetXml()
                    [void]$xmlDoc.DocumentElement.AppendChild($xmlDoc.ImportNode($signatureXml, $true))
                    
                    $sw = New-Object System.IO.StringWriter
                    $xw = New-Object System.Xml.XmlTextWriter($sw)
                    $xmlDoc.WriteTo($xw)
                    $sw.ToString()
                `;

                const tempDir = require('os').tmpdir();
                const fs = require('fs');
                const scriptPath = require('path').join(tempDir, `sign_${Date.now()}.ps1`);
                fs.writeFileSync(scriptPath, psScript, { encoding: 'utf8' });

                try {
                    const result = execSync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
                    fs.unlinkSync(scriptPath);
                    return { success: true, signedXml: result };
                } catch (pe: any) {
                    if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
                    throw new Error(`Erro no PowerShell: ${pe.message}`);
                }
            }

            // --- CASO 2: ASSINATURA VIA PFX (EXISTE ANTERIORMENTE) ---
            if (!pfx || !password) {
                throw new Error('PFX e Senha são obrigatórios para este método de assinatura.');
            }

            const { keyPem, cleanCert } = extractCertData(pfx, password);
            if (!keyPem || !cleanCert) {
                throw new Error('Falha ao extrair chave/certificado do PFX.');
            }

            const regex = new RegExp(`<${tagToSign}\\s+Id="([^"]+)">([\\s\\S]*?)</${tagToSign}>`);
            const match = xml.match(regex);

            if (!match) {
                throw new Error(`Tag <${tagToSign}> não encontrada ou sem atributo Id.`);
            }

            const fullTagBlock = match[0];
            const idValue = match[1];

            const canonicalXml = c14n(fullTagBlock);
            const digestValue = calculateHash(canonicalXml);

            const signedInfo =
                `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod><SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod><Reference URI="#${idValue}"><Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform></Transforms><DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod><DigestValue>${digestValue}</DigestValue></Reference></SignedInfo>`;

            const canonicalSignedInfo = c14n(signedInfo);
            const signatureValue = signContent(canonicalSignedInfo, keyPem);

            const signatureBlock =
                `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">${canonicalSignedInfo}<SignatureValue>${signatureValue}</SignatureValue><KeyInfo><X509Data><X509Certificate>${cleanCert}</X509Certificate></X509Data></KeyInfo></Signature>`;

            const signedXml = xml.replace(fullTagBlock, fullTagBlock + signatureBlock);

            console.log('[Signer] Sucesso.');
            return { success: true, signedXml };

        } catch (error: any) {
            console.error('[Signer] Erro:', error);
            return { success: false, message: error.message };
        }
    });
};
