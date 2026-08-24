# Use Node.js 20 slim as base image
FROM node:20-slim

# Install system libraries for Headless Chromium / Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set env variables so Puppeteer bypasses local download and targets global Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency definition files
COPY package*.json ./

# Install only production dependencies (skips devDependencies like ESLint)
RUN npm ci --only=production

# Copy the rest of the application files
COPY . .

# Express Generator usually runs on port 3000 by default
EXPOSE 3000

# Run using standard node pointing to your start script location
CMD ["node", "./bin/www"]
