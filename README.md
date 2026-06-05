# CONSULTA-CNPJ

Frontend React + Tailwind para consultar CNPJ na API publica `https://publica.cnpj.ws/cnpj/{cnpj}`.

## Como instalar localmente

1. Instale o Node.js 18 ou superior.
2. Copie esta pasta para o outro computador.
3. Rode `npm install`.
4. Rode `npm run dev` para desenvolvimento.
5. Rode `npm run build` para gerar a versao de producao.

## Como publicar na Vercel

1. Suba o projeto para um repositorio GitHub.
2. Importe esse repositorio na Vercel.
3. Framework preset: `Vite`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Conclua o deploy e compartilhe a URL gerada.

## Como publicar via CLI da Vercel

1. Instale a CLI:
   `npm i -g vercel`
2. Rode:
   `vercel`
3. Para producao:
   `vercel --prod`

## O que esta pronto

- Campo de CNPJ com mascara automatica.
- Consulta via API publica.
- Estados de loading e erro.
- Layout responsivo com resumo executivo.
- Explorador dinamico que renderiza todos os campos do JSON.
- Botao para ver JSON bruto e copiar JSON.
- Contador de campos preenchidos.
- Formatacao automatica para CNPJ, CEP, telefones, datas, booleanos e capital social.
- Fluxo pronto para deploy web na Vercel.

## Observacao

A API publica do CNPJ.ws informa limite de ate 3 consultas por minuto na documentacao oficial.
