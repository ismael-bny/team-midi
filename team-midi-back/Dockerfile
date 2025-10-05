FROM denoland/deno:alpine-1.40.4

EXPOSE 8000

WORKDIR /app

COPY . .

CMD ["run", "--allow-net", "--allow-read", "--allow-env", "server.ts"]
