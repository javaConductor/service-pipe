FROM ubuntu:latest
#LABEL authors="Administrator"

#ENTRYPOINT ["top", "-b"]

# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Run the application
CMD ["node", "server.js"]