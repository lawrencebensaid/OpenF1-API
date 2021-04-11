FROM node:12.9.1
COPY . /app
WORKDIR /app
RUN npm install
CMD [ "npm", "start" ]