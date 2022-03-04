import express, { Request, Response } from 'express';
import 'express-async-errors';
import mongoose from 'mongoose';
import cors from 'cors';
const port = process.env.PORT || 8080;

const app = express();
app.use(cors());
app.use(express.json());

const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
import SwaggerOptions from './config/swagger-docs';

const swaggerDocs = swaggerJsDoc(SwaggerOptions);
app.use("/v2/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.get('/', (req: Request, res: Response) => {
  return res.status(200).json({ 
    success: true, 
    message: `FlipOver.io server up and running on port: ${port}` 
  });
});

// Routers
const authRouter = require('./routes/auth.route');
app.use('/auth', authRouter);

app.all('*', async () => {
  throw new Error('Route Not Found...');
});

// Start server :)
const start = async () => {
  try {
    await mongoose.connect(`mongodb+srv://kelechi:0123456789@learnmongodb.quoae.mongodb.net/FlipoverDB?retryWrites=true&w=majority`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true
    });

    console.log('Connected to Auth MongoDB');
    app.listen(port, () => console.log(`Listening on port 8080 (: ${port}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();