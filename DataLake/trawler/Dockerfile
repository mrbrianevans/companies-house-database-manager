FROM node:17-buster

# install pm2 to manage processes
RUN npm install -g pm2@latest

WORKDIR trawler

COPY package*.json /
# install NPM modules
RUN npm config set loglevel warn \
# To mitigate issues with npm saturating the network interface we limit the number of concurrent connections
    && npm config set maxsockets 5 \
    && npm config set progress false \
    && npm i

COPY . .
RUN npm run build

# run PM2
CMD ["pm2-runtime", "processes.config.js"]
