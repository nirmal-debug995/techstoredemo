FROM node:18-alpine AS deps
WORKDIR /app

# copy only backend package files
COPY package.json package-lock.json ./

# install backend dependencies
RUN npm install

# copy backend code
COPY . .

EXPOSE 8080
CMD ["npm", "start"]
