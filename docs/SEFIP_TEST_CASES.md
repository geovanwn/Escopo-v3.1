# Casos de Teste - Geração de Arquivo SEFIP 8.4

O presente documento lista os cenários de teste obrigatórios para assegurar a integridade da adequação efetuada no gerador SEFIP da plataforma.

## Cenário 01: Validação Preventiva de Dados Obrigatórios
**Objetivo:** Garantir que o sistema impeça a geração e acuse falhas se dados essenciais não estiverem preenchidos.
**Pré-condições:** Empresa sem FPAS ou sem Código de Terceiros definido no cadastro. Empregados sem PIS/CPF válidos.
**Passos:**
1. Acessar o módulo de "Declarações".
2. Selecionar "SEFIP 8.4".
3. Clicar em "Gerar Arquivo" para uma competência válida onde a folha já está fechada.
**Resultado Esperado:** O sistema não deve gerar o arquivo. A tabela de Histórico deve registrar o status como "Falha na Geração / Pendências", e clicando no ícone de "olho" (Detalhes), o usuário deve ver listadas textualmente as pendências (Ex: "O campo FPAS é obrigatório").

## Cenário 02: Geração GFIP Regular Com Movimento (Código 115)
**Objetivo:** Verificar a estruturação do arquivo básico para recolhimento mensal de FGTS e INSS.
**Pré-condições:** Empresa totalmente parametrizada. Pelo menos um empregado com salário, INSS e FGTS na folha. Folha fechada na competência testada.
**Passos:**
1. Acessar Módulo "Declarações" -> "SEFIP 8.4".
2. Selecionar Período de Apuração que contenha o fechamento de folha.
3. Desmarcar "Sem Movimento" e "Retificadora".
4. Selecionar Código "115".
5. Clicar em "Gerar Arquivo".
6. Fazer download e importar no programa Validador/Simulador da SEFIP da CAIXA.
**Resultado Esperado:** O sistema deve produzir o arquivo sem erros internos. O validador da CAIXA deve importar o arquivo sem apresentar rejeição de layout posicional e reconhecer os valores idênticos aos listados na folha de pagamento do sistema.

## Cenário 03: Geração GFIP Sem Movimento
**Objetivo:** Validar o correto comportamento da ausência de fatos geradores.
**Pré-condições:** Nenhuma pré-condição específica, exceto ter a Empresa cadastrada.
**Passos:**
1. Selecionar o "Período de Apuração".
2. Marcar a flag "Gerar Zerada (Sem Movimento)".
3. Clicar em "Gerar Arquivo".
4. Baixar o arquivo `SEFIP.RE` e visualizá-lo em bloco de notas.
5. Importar no SEFIP.
**Resultado Esperado:** A validação do sistema deve ignorar a obrigatoriedade de existir folha para o mês. O arquivo exportado DEVE conter os Registros 00 e 10, DEVE omitir o Registro 30 e conter o Registro 90. A modalidade padrão imposta pelo gerador deve constar adequadamente como "1".

## Cenário 04: GFIP Retificadora
**Objetivo:** Confirmar o uso da tag "Retificadora" e substituição no layout.
**Pré-condições:** Folha de um mês recalculada e diferente de uma GFIP já transmitida.
**Passos:**
1. Selecionar Mês e Ano.
2. Marcar flag "Retificadora".
3. Clicar em "Gerar Arquivo".
4. Visualizar os registros do arquivo exportado.
**Resultado Esperado:** No Registro 00 (cabeçalho), o campo de Modalidade deverá refletir "9" (Confirmação), que substituirá todos os empregados que não tiveram correção e os demais serão alocados corretamente pelo aplicativo SEFIP como retificação de declaração de valores (branco). O comportamento será avaliado ao realizar o fechamento dentro do aplicativo CAIXA.

## Cenário 05: Extração e Tratamento de Caracteres Especiais
**Objetivo:** Validar o comportamento do gerador diante de nomes e endereços "sujos".
**Pré-condições:** Inserir um empregado ou nome de rua da empresa com caracteres especiais intensos (Ex: Nome = "João d'Ávila & Silva § ºª", Rua = "Av. São João - Lote/13").
**Passos:**
1. Editar os dados do cadastro no sistema e salvar.
2. Gerar arquivo GFIP padrão "Com Movimento".
3. Conferir posições de String no arquivo exportado.
4. Importar o arquivo no programa da SEFIP.
**Resultado Esperado:** O gerador interno (função `normalizeSefip`) deve higienizar completamente as strings para caracteres de código simples e maiúsculos (ANSI: A-Z 0-9), sem gerar linhas desalinhadas. Na validação da SEFIP não devem ocorrer erros de "Caractere Inválido".
