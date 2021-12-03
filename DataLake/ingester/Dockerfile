FROM node:17-buster

# install pm2 to manage processes
RUN npm install -g pm2@latest

# install mongo tools for mongoimport (requires the buster base image for debian 10 tools)
RUN wget -q https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian10-x86_64-100.5.1.deb && \
        apt install ./mongodb-database-tools-*.deb && \
        rm -f mongodb-database-tools-*.deb

# install GSUTIL for accessing storage bucket
RUN apt-get update && \
    apt-get install apt-transport-https ca-certificates gnupg curl wget unzip -y && \
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] http://packages.cloud.google.com/apt cloud-sdk main" |\
    tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg |\
    apt-key --keyring /usr/share/keyrings/cloud.google.gpg  add - && \
    apt-get update -y && \
    apt-get install google-cloud-sdk -y

# copy the key into a volume
VOLUME /.credentials
COPY .credentials/gcp-key.json /.credentials/
ENV GOOGLE_APPLICATION_CREDENTIALS="/.credentials/gcp-key.json"

COPY streams/package*.json streams/
# install NPM modules
RUN cd streams && npm config set loglevel warn \
# To mitigate issues with npm saturating the network interface we limit the number of concurrent connections
    && npm config set maxsockets 5 \
    && npm config set progress false \
    && npm i

COPY . .
RUN cd streams && npm run build

# run PM2
CMD ["bash","entrypoint.sh"]
