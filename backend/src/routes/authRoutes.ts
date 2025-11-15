import { Router } from "express";
import { register, login } from "../controller/authController";
import { verifySchema } from "../middleware/validateSchema";
import { userSchema, loginSchema } from "../model/User/userModel";

const authRouter = Router();

authRouter
  .post("/register", verifySchema(userSchema), register)
  .post("/login", verifySchema(loginSchema), login);

export default authRouter;
