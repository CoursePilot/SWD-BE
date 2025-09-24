const swaggerJsdoc = require('swagger-jsdoc');

// Swagger setup
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "SWD Backend API",
      version: "1.0.0",
      description: "RESTful API docs for testing",
    },
    servers: [
      {
        url: "http://localhost:3000",
      },
    ],
  },
  apis: [
    "./routes/*.js",
  ],
};



const specs = swaggerJsdoc(swaggerOptions);

module.exports = specs;