FROM node:17-slim

# install pm2 to manage processes
RUN npm install -g pm2@latest

COPY . .

WORKDIR /streams

RUN npm config set loglevel warn \
# To mitigate issues with npm saturating the network interface we limit the number of concurrent connections
    && npm config set maxsockets 5 \
    && npm config set progress false \
    && npm i && npm run build

CMD ["pm2-runtime", "processes.json"]
