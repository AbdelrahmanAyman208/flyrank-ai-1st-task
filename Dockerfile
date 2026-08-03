# Use official lightweight Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
