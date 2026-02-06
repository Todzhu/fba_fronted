docker run -it --rm \
  --memory=64g \
  -v /home/ztt/fba/fronted:/fba_ui \
  -w /fba_ui \
  -p 5173:5173 \
  node:lts-alpine3.23 \
  sh -c "npm install -g pnpm@9 && pnpm install && pnpm dev:antd --host 0.0.0.0"