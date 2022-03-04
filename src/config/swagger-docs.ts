// Extended: https://swagger.io/specification/#infoObject
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.1",
    info: {
      version: "1.0.0",
      title: "Flipover API.",
      description: "Flipover API Information.",
      contact: {
        name: "Amazing Developer"
      },
      tags: [
        {
          "name": "Auth operations"
        },
        {
          "name": "User operations"
        }
      ]
    },
    servers: [
      {
        "url": "http://localhost:8080/",
        "description": "Local server"
      },
      {
        "url": "https://flipover-app.herokuapp.com/",
        "description": "Heroku Testing server"
      }
    ]
  },
  apis: ["src/controllers/auth.controller.ts"]
};

export default swaggerOptions;