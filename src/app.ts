import express, { Application, Request, Response } from "express";
import cors from "cors";
import globalErrorHandler from "./app/middlewares/globalErrorhandler";
import sensorRoutes from "./app/modules/sensorData/sensorData.routes";
const app: Application = express();
const router = express.Router();

// parser
app.use(express.json());
app.use(cors({origin: [
    "http://localhost:5173",
    "http://localhost:3000"
  ], credentials: true}));
// app.use(cookieParser()); // Add this

// application routes 

router.get('/', (req:Request,res:Response)=>{
  res.send('Welcome to FarmFlow app server..')
});

app.use('/', router);
app.use('/sensorData', sensorRoutes);


app.use(globalErrorHandler);


export default app;
