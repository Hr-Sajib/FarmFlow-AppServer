import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from 'cookie-parser'; // Import cookie-parser
import globalErrorHandler from "./app/middlewares/globalErrorhandler";
import { UserRoutes } from "./app/modules/appData/user/user.route";
import { AuthRoutes } from "./app/modules/appData/auth/auth.route";
import sensorRoutes from "./app/modules/sensorData/sensorData.routes";
import { PostRoutes } from "./app/modules/appData/posts/post.route";
// import sensorRoutes from "./app/modules/sensorData/sensorData.routes";
const app: Application = express();
const router = express.Router();

// parser
app.use(express.json());
app.use(cors({origin: [
    "http://localhost:5173",
    "http://localhost:3000"
  ], credentials: true}));
app.use(cookieParser()); // Add this

// application routes 

router.get('/', (req:Request,res:Response)=>{
  res.send('Welcome to FarmFlow app server..')
});

app.use('/user', UserRoutes);
app.use('/auth', AuthRoutes);
app.use('/sensorData', sensorRoutes);
app.use('/post', PostRoutes);


app.use(globalErrorHandler);


export default app;
