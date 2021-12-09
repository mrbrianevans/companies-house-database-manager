FROM node:17-buster

WORKDIR app/

COPY package*.json /
# install NPM modules
RUN npm config set loglevel warn \
# To mitigate issues with npm saturating the network interface we limit the number of concurrent connections
    && npm config set maxsockets 5 \
    && npm config set progress false \
    && npm i

COPY . .

RUN npm run build

ENTRYPOINT ["npm", "run", "start"]