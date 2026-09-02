# EventHub MVC

Aplicacao monolitica de gestao de eventos e inscricoes, com telas EJS renderizadas no servidor, autenticacao por cookie assinado e persistencia MySQL.

## Recursos

- cadastro e login com senha protegida por `bcryptjs`;
- perfis `organizador` e `participante`;
- CRUD de eventos restrito ao organizador responsavel;
- detalhes, vagas e inscricao unica por participante;
- consultas parametrizadas com `mysql2.execute()`;
- cookie `httpOnly`, `SameSite=Lax` e `Secure` em producao.

## Instalacao local

```bash
npm install
mysql -u root -p < eventhub.sql
copy .env.example .env
npm start
```

Acesse `http://localhost:3000`. Execute o smoke test com `npm test`.

## Variaveis de ambiente

| Variavel | Uso |
| --- | --- |
| `PORT` | Porta HTTP. |
| `DB_HOST`, `DB_PORT` | Endereco do MySQL. |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Credenciais e banco. |
| `DB_SSL` | Ative com `true` quando o provedor exigir TLS. |
| `DB_SSL_REJECT_UNAUTHORIZED` | Validacao do certificado TLS. |
| `SESSION_SECRET` | Chave longa e aleatoria para assinar a sessao. |

O arquivo `.env` e local e esta ignorado pelo Git. Nunca envie credenciais ao repositorio.

## Deploy

O `render.yaml` cria um Web Service no Render. Antes do deploy, importe `eventhub.sql` em um MySQL gerenciado e configure as variaveis no painel. Use `DB_SSL=true` quando exigido pelo provedor e teste cadastro, login, CRUD e inscricao pela URL publica em janela anonima.

Repositorio: https://github.com/FelipeOldenburg/projeto-mvc.git

URL esperada da aplicacao: configure e registre aqui apos criar o servico no Render.
