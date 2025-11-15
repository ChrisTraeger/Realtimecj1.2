import express, { Request, Response } from "express";
import path from "path";
import cors from "cors";
import showRequests from "./middleware/showRequest";
import authRouter from "./routes/authRoutes";
import chatRoutes from "./routes/chatRoutes";
import userRoutes from "./routes/userRoutes";
import testRoutes from "./routes/testRoutes";
import roomRoutes from "./routes/roomRoutes";
import pollRoutes from "./routes/pollRoutes";
import { pollService } from "./service/pollService";

const app = express();
const port = process.env.PORT || 8000;

app.use(cors({
  origin: 'http://localhost:3000',
  exposedHeaders: ["token"],
  credentials: true
}));
app.use(express.json());
app.use(showRequests);

const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.use("/auth", authRouter);
app.use("/chat", chatRoutes);
app.use("/user", userRoutes);
app.use("/test", testRoutes);
app.use("/rooms", roomRoutes);    
app.use("/polls", pollRoutes);

// Inicializar scheduler para encuestas
pollService.initScheduler();

export { app, port };
