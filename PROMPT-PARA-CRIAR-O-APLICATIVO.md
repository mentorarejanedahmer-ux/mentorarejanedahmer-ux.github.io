# Prompt completo — Aplicativo Social Seller

Copie o texto abaixo e entregue à inteligência artificial junto com a pasta deste código. Substitua os itens entre colchetes pelos dados da compradora.

---

Crie e personalize um aplicativo instalável para celular chamado **[NOME DO APLICATIVO]**, destinado a **[TIPO DE PROFISSIONAL]**, preservando todas as funções do código-base recebido.

## Objetivo

O aplicativo deve funcionar como uma secretária de Social Selling. Ele organiza possíveis clientes, informa a próxima ação, cria mensagens personalizadas e acompanha cada conversa até o agendamento ou a venda.

## Identidade da usuária

- Nome: [NOME]
- Profissão: [PROFISSÃO]
- Produto ou serviço: [OFERTA]
- Público ideal: [DESCREVA O CLIENTE IDEAL]
- Tom das mensagens: [HUMANO, DIRETO, ACOLHEDOR ETC.]
- Cor principal: [COR]
- Cor secundária: [COR]
- CTA principal: [EXEMPLO: AGENDAR DIAGNÓSTICO]

## Funções obrigatórias

1. Tela **Hoje** com uma única próxima ação clara.
2. Tela **Pessoas** com busca por nome, @, negócio e classificação.
3. Tela **Adicionar** com formulário manual e opção de anexar foto ou print do Instagram.
4. Ao receber o print, ler localmente nome, @, profissão/negócio e WhatsApp visível.
5. Analisar o texto visível do perfil e classificar a pessoa como:
   - PMI forte;
   - possível PMI;
   - não prioritária;
   - revisar perfil.
6. Mostrar o motivo da classificação e permitir correção manual antes de salvar.
7. Criar uma primeira mensagem personalizada usando nome e profissão/negócio, sem inventar informações.
8. Ter os resultados: Enviei, Não respondeu, Respondeu, Levar para WhatsApp, Já está no WhatsApp, Diagnóstico, Fechou, Não procurar mais e Bloqueou.
9. Ao marcar **Não respondeu**, registrar a tentativa e programar o primeiro follow-up para três dias depois. Se continuar sem resposta, programar o próximo para sete dias depois.
10. Abrir o perfil no Instagram, abrir o WhatsApp e copiar a mensagem.
11. Impedir contatos duplicados pelo @ do Instagram.
12. Manter dados e fotos apenas no navegador/aparelho, usando armazenamento local.
13. Fazer e restaurar backup em JSON.
14. Ser instalável na tela inicial como PWA e funcionar offline depois do primeiro acesso, exceto a primeira leitura do print.
15. Ser responsivo, com botões grandes e textos legíveis no celular.

## Regras de segurança e qualidade

- Não enviar mensagens automaticamente sem ação da usuária.
- Não prometer acesso à lista completa de seguidores ou curtidas do Instagram.
- Não inventar renda, faturamento, profissão ou capacidade de investimento.
- Tratar a classificação automática como triagem; a usuária confirma antes de salvar.
- Preservar os dados existentes ao atualizar o aplicativo.
- Entregar todos os arquivos completos e prontos para publicação: `index.html`, `manifest.webmanifest`, `sw.js`, ícone e instruções.
- Testar leitura do print, cadastro, classificação, mensagens, botão Não respondeu, follow-ups, backup, restauração e instalação.

## Mensagens

As mensagens devem ser curtas, humanas e específicas. A primeira abordagem deve reconhecer somente algo realmente visível no perfil e terminar com uma pergunta simples de qualificação. Nunca usar elogio genérico exagerado, pressão ou texto com aparência de robô.

Entregue o aplicativo pronto, sem remover nenhuma função do código-base.

---

## Observação para comercialização

O código usa Tesseract.js para leitura local de texto em imagens. Ao distribuir, mantenha os avisos de licença aplicáveis às bibliotecas de terceiros. A análise PMI é uma triagem baseada no texto visível do print e sempre deve ser conferida pela usuária.
