# Sistema de Auditoria de Arquivos

## Visão Geral

O Sistema de Auditoria de Arquivos foi desenvolvido para rastrear todas as operações realizadas com arquivos XML e documentos fiscais no sistema EscopoV3. Ele fornece um registro completo e imutável de todas as ações, garantindo conformidade, segurança e rastreabilidade.

## Funcionalidades Principais

### 1. Rastreamento Completo de Operações

O sistema registra automaticamente:

- **Upload de Arquivos**: Quando arquivos XML são carregados no sistema
- **Download de Arquivos**: Quando arquivos são baixados (individual ou em lote)
- **Visualização**: Quando arquivos são visualizados
- **Edição**: Quando metadados ou conteúdos são modificados
- **Exclusão**: Quando arquivos são removidos
- **Validação**: Quando certificados ou XMLs são validados
- **Assinatura**: Quando documentos são assinados digitalmente
- **Importação/Exportação**: Operações de importação e exportação em massa

### 2. Informações Capturadas

Para cada operação, o sistema registra:

#### Dados do Usuário
- ID do usuário
- Nome completo
- Email
- Endereço IP (quando disponível)
- User Agent (navegador/dispositivo)

#### Dados do Arquivo
- Nome do arquivo
- Tipo (NFS-e, NF-e, CT-e, MDF-e, XML, PDF, Certificado)
- Tamanho em bytes
- Hash SHA-256 (para verificação de integridade)
- Caminho relativo (se armazenado)

#### Dados da Operação
- Tipo de operação
- Status (sucesso, falha, parcial)
- Módulo de origem
- Descrição detalhada
- Timestamp preciso (ISO 8601)
- Mensagem de erro (se aplicável)

#### Metadados Contextuais
- Número da nota fiscal
- Chave de acesso
- Data de emissão
- Valor
- CNPJ
- Outros dados relevantes ao contexto

### 3. Interface de Visualização

#### Aba "Registros de Auditoria"

Tabela completa com:
- Data/Hora da operação
- Usuário responsável
- Tipo de operação (com ícone visual)
- Nome do arquivo
- Módulo de origem
- Status (badge colorido)
- Tamanho do arquivo

#### Filtros Avançados
- **Período**: Data inicial e final
- **Busca Textual**: Arquivo, usuário, descrição
- **Tipo de Arquivo**: NFS-e, NF-e, CT-e, etc.
- **Operação**: Upload, Download, Delete, etc.
- **Módulo**: Fiscal, XMLs, NFS-e Fetcher, etc.
- **Status**: Sucesso, Falha, Parcial

#### Aba "Estatísticas"

Cards com métricas:
- Total de operações
- Operações bem-sucedidas
- Operações com falha
- Total de arquivos processados
- Volume total de dados (em MB/GB)

Gráficos:
- Operações por tipo
- Operações por módulo
- Usuários mais ativos

### 4. Exportação de Dados

- **Formato CSV**: Exportação completa dos registros filtrados
- **Compatível com Excel**: Formatação adequada para análise
- **Campos Inclusos**: Todos os dados relevantes para auditoria

### 5. Política de Retenção

- **Padrão**: 90 dias de histórico
- **Configurável**: Pode ser ajustado conforme necessidade
- **Limpeza Automática**: Remove registros antigos automaticamente
- **Backup**: Logs podem ser exportados antes da limpeza

## Integração com Módulos

### NFS-e Fetcher

Registra automaticamente:
- Consultas de NFS-e via certificado digital
- Downloads de XMLs individuais
- Downloads em lote
- Impressão de relatórios
- Validação de certificados

Metadados capturados:
- Tipo de consulta (emitidas/recebidas)
- Período consultado
- Endpoint utilizado
- Quantidade de notas encontradas
- Valor total das notas

### Módulo Fiscal

Registra:
- Upload de XMLs de NF-e
- Processamento de notas
- Geração de relatórios
- Exportação de dados

### Módulo XMLs

Registra:
- Importação de arquivos
- Validação de XMLs
- Conversão de formatos
- Assinatura digital

## Segurança e Conformidade

### Integridade dos Dados

- **Hash SHA-256**: Cada arquivo tem um hash único para verificar integridade
- **Imutabilidade**: Registros de auditoria não podem ser editados ou excluídos
- **Timestamp Preciso**: Registro exato do momento da operação

### Rastreabilidade

- **Cadeia Completa**: Histórico completo de todas as operações
- **Identificação de Usuário**: Sempre vinculado a um usuário específico
- **Contexto Completo**: Metadados ricos para entender o contexto

### Conformidade

Atende requisitos de:
- **LGPD**: Rastreamento de acesso a dados sensíveis
- **SPED**: Auditoria de documentos fiscais
- **ISO 27001**: Controles de segurança da informação
- **SOC 2**: Auditoria de sistemas

## Arquitetura Técnica

### Componentes

1. **Types** (`types/audit.ts`)
   - Interfaces TypeScript
   - Definições de tipos
   - Contratos de dados

2. **Service** (`services/fileAudit.ts`)
   - Lógica de negócio
   - Persistência de logs
   - Consultas e filtros
   - Exportação de dados

3. **Hook** (`hooks/useFileAudit.ts`)
   - Interface simplificada para componentes
   - Gerenciamento de estado
   - Chamadas assíncronas

4. **Componente** (`components/audit/FileAuditViewer.tsx`)
   - Interface de usuário
   - Visualização de logs
   - Filtros interativos
   - Estatísticas

5. **Página** (`pages/Audit.tsx`)
   - Ponto de entrada
   - Lazy loading
   - Roteamento

### Fluxo de Dados

```
Ação do Usuário
    ↓
Componente (ex: NFSeFetcher)
    ↓
useFileAudit Hook
    ↓
FileAuditService
    ↓
Persistência (Memória/DB)
    ↓
FileAuditViewer (Visualização)
```

### Persistência

**Atual**: Em memória (desenvolvimento)
**Produção**: 
- Backend API com banco de dados
- Electron: SQLite local
- Web: API REST com PostgreSQL/MongoDB

## Uso no Código

### Exemplo Básico

```typescript
import { useFileAudit } from '../../hooks/useFileAudit';

const MyComponent = () => {
    const { logFileOperation } = useFileAudit();
    
    const handleDownload = async (file) => {
        // ... lógica de download ...
        
        await logFileOperation(
            'download',
            file.name,
            'nfse',
            'my_module',
            {
                companyId: company.id,
                userName: user.name,
                fileSize: file.size,
                status: 'success',
                description: 'Download de NFS-e',
                metadata: {
                    noteNumber: file.noteNumber,
                    value: file.value
                }
            }
        );
    };
};
```

### Exemplo Avançado com Tratamento de Erro

```typescript
const handleUpload = async (file) => {
    try {
        // Processar upload
        const result = await uploadFile(file);
        
        // Log de sucesso
        await logFileOperation(
            'upload',
            file.name,
            'nfe',
            'fiscal',
            {
                companyId: company.id,
                userName: user.name,
                fileSize: file.size,
                status: 'success',
                description: `Upload de NF-e processado com sucesso`,
                metadata: {
                    accessKey: result.accessKey,
                    value: result.value
                }
            }
        );
    } catch (error) {
        // Log de falha
        await logFileOperation(
            'upload',
            file.name,
            'nfe',
            'fiscal',
            {
                companyId: company.id,
                userName: user.name,
                fileSize: file.size,
                status: 'failed',
                description: `Falha no upload de NF-e`,
                errorMessage: error.message
            }
        );
    }
};
```

## Roadmap

### Fase 1 (Atual) ✅
- [x] Estrutura de tipos
- [x] Service básico
- [x] Hook de integração
- [x] Componente de visualização
- [x] Integração com NFS-e Fetcher

### Fase 2 (Próxima)
- [ ] Persistência em banco de dados
- [ ] API backend completa
- [ ] Notificações de eventos críticos
- [ ] Dashboard executivo
- [ ] Relatórios agendados

### Fase 3 (Futuro)
- [ ] Machine Learning para detecção de anomalias
- [ ] Alertas em tempo real
- [ ] Integração com SIEM
- [ ] Blockchain para imutabilidade garantida
- [ ] Compliance automático com regulações

## Manutenção

### Limpeza de Logs Antigos

```typescript
import { fileAudit } from '../services/fileAudit';

// Manter apenas 90 dias
const removed = await fileAudit.clearOldLogs(90);
console.log(`${removed} registros antigos removidos`);
```

### Exportação Programática

```typescript
const csv = await fileAudit.exportToCSV({
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    companyId: 'company-123'
});

// Salvar em arquivo
fs.writeFileSync('audit-2026.csv', csv);
```

## Suporte

Para dúvidas ou problemas:
1. Consulte este documento
2. Verifique os logs do console
3. Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Última Atualização**: 2026-02-09  
**Autor**: Equipe EscopoV3
