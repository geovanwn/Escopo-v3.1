# Manual de Uso Interno - Módulo SEFIP 8.4

Este manual orienta a equipe operacional sobre como realizar a geração de arquivos SEFIP através da plataforma de Declarações e Obrigações do sistema.

## 1. Acesso ao Módulo
1. No menu principal da aplicação, navegue até a opção **Declarações**.
2. Na barra lateral esquerda, clique em **SEFIP 8.4**.

## 2. Pré-requisitos
Antes de gerar o arquivo, o usuário deve garantir que:
- O cadastro da **Empresa** (Configurações > Empresa) está completo, possuindo CNPJ, endereço completo, FPAS, e Código de Terceiros.
- A **Folha de Pagamento** do período desejado foi concluída (exceto para transmissões Sem Movimento).
- Todos os **Trabalhadores e Sócios** que recebem pró-labore possuem CPF, PIS/NIT, CBO e Data de Admissão cadastrados no DP Pessoal.

## 3. Gerando o Arquivo (Com Movimento)
Esta rotina é a declaração regular da folha mensal.

1. No campo **Período de Apuração**, selecione o Mês/Ano desejado (ex: 12/2024).
2. Deixe a opção **Gerar Zerada (Sem Movimento)** DESMARCADA.
3. No seletor **Código Rec.**, selecione a modalidade de recolhimento correta:
   - **115**: Recolhimento mensal padrão.
   - **150 / 155**: Usados em casos de prestação de serviços, obras de construção civil ou outras modalidades empresariais específicas.
4. Deixe a opção **Retificadora** DESMARCADA, a não ser que você já tenha feito um envio deste mês e queira alterá-lo.
5. Clique no botão **Gerar Arquivo**.
6. Aguarde a validação prévia. Se houver pendências cadastrais, uma linha com erro aparecerá na tabela detalhando o que precisa ser corrigido.
7. Se aprovado, uma nova linha na tabela aparecerá como **Gerado**. Clique no botão **Baixar Arquivo** (ícone de nuvem) para obter o documento `SEFIP.RE`.

## 4. Gerando GFIP Sem Movimento
Sempre que a empresa não possuir fatos geradores de contribuição previdenciária e nem recolhimento de FGTS no mês, a GFIP Sem Movimento deve ser transmitida.

1. Selecione o **Período de Apuração**.
2. Marque a caixa de seleção **Gerar Zerada (Sem Movimento)**.
3. Opcional: A modalidade automaticamente mudará para 1 (Declaração), e o sistema não exigirá a folha fechada para o mês correspondente.
4. Clique em **Gerar Arquivo**.
5. O arquivo será gerado constando apenas as identificações da empresa (sem registros de funcionários - Registro 30).

## 5. Gerando GFIP Retificadora
Se houver a necessidade de retificar dados declarados anteriormente (substituição integral):

1. Selecione o **Período de Apuração** em que ocorreu o erro.
2. Certifique-se que a folha de pagamento do período foi corrigida (reprocessada) no sistema com os valores certos.
3. Marque a opção **Retificadora**.
4. Clique em **Gerar Arquivo**.
5. O arquivo gerado automaticamente emitirá um código de Modalidade `9` (Confirmação de Informações), para os vínculos que não tiveram os valores alterados. No momento do import no SEFIP, certifique-se das marcações do aplicativo da CAIXA.

## 6. Importação no SEFIP Oficial
1. Abra o aplicativo **SEFIP 8.4** instalado em seu computador.
2. Acesse o menu **Arquivo > Importar Folha**.
3. Selecione o arquivo `.RE` baixado pelo sistema.
4. O aplicativo procederá com a validação final da CAIXA. Caso acusem erros de base de cálculo, retorne ao sistema, ajuste no DP e re-gere o arquivo.
5. Após importado com sucesso, execute o processamento para emissão da GRF.

## 7. Mensagens Comuns e Soluções
- **Erro: "O campo FPAS é obrigatório"** -> Vá no menu Configurações da Empresa, acesse a aba Fiscal/Trabalhista e preencha o FPAS.
- **Erro: "Folha de pagamento não encontrada"** -> Não houve processamento da folha no período. Vá ao módulo DP > Fechamento de Folha.
- **Erro: "Não há funcionários ou sócios cadastrados"** -> Vá no Módulo Pessoal e insira os dados cadastrais da equipe.
