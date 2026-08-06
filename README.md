# Loja MVC

Aplicacao monolitica em Node.js, Express e EJS para demonstrar a arquitetura MVC em producao.

## Objetivo

O projeto renderiza as telas no servidor e persiste os dados em um banco MySQL. Ele foi preparado para a atividade final de deploy e homologacao, representando a aplicacao MVC/monolitica.

## Tecnologias

- Node.js
- Express
- EJS
- MySQL
- dotenv

## Estrutura

- `server.js`: configura o Express, views, arquivos estaticos e rotas.
- `routes/userRoutes.js`: define as rotas da aplicacao.
- `controllers/userControllers.js`: processa as requisicoes e renderiza as views.
- `models/userModels.js`: acessa o banco MySQL com prepared statements.
- `views/`: paginas EJS renderizadas no servidor.
- `public/`: CSS e arquivos estaticos.

## Rotas

- `GET /`: pagina inicial do showroom MVC.
- `GET /about`: explicacao do projeto.
- `GET /contato`: informacoes de contato.
- `GET /produtos`: lista produtos cadastrados no banco.
- `POST /produtos`: cadastra um novo produto.
- `GET /produtos/:id/editar`: abre a tela de edicao.
- `POST /produtos/:id`: atualiza o produto no banco.
- `GET /version`: rota simples de validacao.

## Banco de dados

O projeto usa as tabelas `produtos` e `categorias` do banco `loja`.

Para homologacao, o banco precisa ficar em nuvem, por exemplo em uma instancia MySQL da Aiven. A Vercel hospeda apenas a aplicacao Node.js; ela nao hospeda o banco MySQL deste projeto.

Variaveis esperadas:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=loja
PORT=3000
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
```

Em producao, configure essas variaveis no painel da Vercel/Render com os dados do banco MySQL em nuvem:

- `DB_HOST`: host publico do banco.
- `DB_PORT`: porta do banco.
- `DB_USER`: usuario do banco.
- `DB_PASSWORD`: senha do banco.
- `DB_NAME`: nome do banco, neste projeto `loja`.
- `DB_SSL`: use `true` se o provedor exigir conexao SSL.

## Como rodar localmente

```bash
npm install
cp .env.example .env
npm start
```

Acesse:

```text
http://localhost:3000
```

## Teste

```bash
npm test
```

O teste confirma que o servidor sobe e que as principais paginas renderizadas respondem corretamente.

## Deploy

O projeto possui `render.yaml` para Render e `vercel.json` para Vercel. No deploy, configure as variaveis do banco MySQL em nuvem antes de testar `/produtos`.
