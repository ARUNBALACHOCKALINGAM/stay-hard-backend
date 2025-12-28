# Use lightweight Node image
FROM node:18-slim

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy app files
COPY . .

# Cloud Run uses port 8080
EXPOSE 8080

RUN npm run build

# Start app
CMD ["npm", "start"]
