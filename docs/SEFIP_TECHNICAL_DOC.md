# Documentação Técnica - Geração SEFIP 8.4

## 1. Visão Geral
O módulo de geração da SEFIP 8.4 tem como objetivo formatar os dados de folha de pagamento da empresa e de seus trabalhadores num arquivo posicional (texto fixo) com extensão `.RE`, que será posteriormente importado pelo aplicativo oficial da CAIXA Econômica Federal (SEFIP).

A rotina foi desenvolvida no arquivo `utils/sefip84Generator.ts`.

## 2. Estrutura do Arquivo SEFIP
O arquivo segue rigidamente o formato posicional exigido no Manual da GFIP/SEFIP 8.4, com as seguintes especificações globais:
- Arquivo de texto sem delimitadores.
- Todos os campos alfanuméricos são alinhados à esquerda e preenchidos com espaços à direita.
- Todos os campos numéricos são alinhados à direita e preenchidos com zeros à esquerda.
- Caracteres especiais e acentos são removidos.
- Fim de linha representado por `\r\n`.
- Os valores financeiros são impressos com centavos implícitos, sem ponto ou vírgula.

## 3. Tipos de Registros Implementados

### 3.1 Registro 00 - Abertura (Header)
O registro do cabeçalho da remessa, contendo dados da empresa responsável e parâmetros gerais.
**Principais posições:**
- `01-02`: Tipo de Registro ("00")
- `54`: Tipo de Remessa (1 = Arquivo GFIP)
- `56-69`: CNPJ do responsável
- `70-99`: Nome do responsável
- `292-297`: Competência (AAAAMM)
- `298-300`: Código de Recolhimento (Ex: 115)
- `302`: Modalidade da GFIP (1 = Declaração, 9 = Confirmação, Branco = Recolhimento)

### 3.2 Registro 10 - Dados do Empregador
Registro contendo os dados do estabelecimento tomador ou empregador.
**Principais posições:**
- `01-02`: Tipo de Registro ("10")
- `04-17`: CNPJ da Empresa
- `54-93`: Razão Social
- `206-212`: CNAE
- `214-217`: FPAS
- `222-224`: Alíquota RAT
- `227-272`: Bases e contribuições consolidadas (ex: 13º salário)

### 3.3 Registro 30 - Dados do Trabalhador
Registro contendo os dados do funcionário ou sócio, com suas respectivas bases de cálculo e descontos no período. *Ausente em envios "Sem Movimento".*
**Principais posições:**
- `01-02`: Tipo de Registro ("30")
- `33-43`: PIS/PASEP/NIT
- `44-51`: Data de Admissão
- `52-53`: Categoria do Trabalhador (ex: 01 = Empregado, 11 = Diretor não empregado)
- `54-93`: Nome
- `105-115`: CPF
- `129-143`: Remuneração Sem 13º (Base FGTS)
- `161-175`: Desconto de INSS
- `176-190`: Base de Cálculo INSS

### 3.4 Registro 90 - Encerramento (Trailer)
O último registro do arquivo, preenchido com 9s para sinalizar o fim da leitura do arquivo.
- `01-02`: Tipo de Registro ("90")
- `03-359`: Preenchimento contínuo com "9"
- Fim com asterisco `*`.

## 4. Parâmetros da Rotina de Geração
A assinatura do método principal é:
```typescript
export const generateSEFIP84 = (
    company: CompanyEntity,
    employees: Employee[],
    payrollRun: PayrollRun | null,
    responsible: { name: string; phone: string; contact: string },
    options: SefipOptions
): string
```

### 4.1 Interface `SefipOptions`
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `isZeroMovement` | `boolean` | Se verdadeiro, não gera o Registro 30 e altera o indicador de fato gerador (modalidade padrão = 1). |
| `isRectification` | `boolean` | Altera a modalidade para 9 caso a intenção seja substituir informações anteriores. |
| `isRescission` | `boolean` | Reservado para tratativas futuras de GRRF/códigos rescisórios. |
| `codigoRecolhimento`| `string` | O código FGTS a ser transmitido (ex: 115, 150, 155). |
| `modalidade` | `string` | A modalidade específica para as guias do mês. |

## 5. Fluxo de Tratamento de Dados (Parsing e Sanitização)
As funções utilitárias em `sefip84Generator.ts` incluem:
- `normalizeSefip`: Remove pontuações e acentos, conforme padrão ANSI (Windows-1252), mantendo UPPERCASE.
- `fStr`: Preenche com espaços até o limite do campo.
- `fNum`: Preenche com zeros à esquerda até o limite do campo.
- `fDate`: Converte a data do formato AAAA-MM-DD para DDMMAAAA.
- `fVal`: Pega valores flutuantes, converte para numérico sem casa decimal (multiplicando por 100) preenchido por zeros à esquerda.

## 6. Considerações de Validação
O sistema prevê pré-validações na UI antes da execução da geração:
- Existência de CNPJ, FPAS e Código de Terceiros da empresa.
- Em caso de rotina **Com Movimento**, a folha do mês escolhido deve ter lançamentos concluídos.
- Todos os trabalhadores incluídos no Registro 30 devem ter CPF, PIS e data de admissão preenchidos validamente.
