# 1. Use Node base image
FROM node:20

# 2. Set working directory
WORKDIR /app

# 3. Copy only package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the code
COPY . .

# 5. Copy environment variables for production build
COPY .env.production .env.production

# 6. Set environment variable for production
ENV NODE_ENV=production

# 7. Build the app
RUN npm run build

# 8. Expose the port Next.js will run on
EXPOSE 3000

# 9. Start the Next.js app
CMD ["npm", "start"]
