import { Request, Response, NextFunction } from "express";
import createToken from "../middleware/jwt/createToken";
import userService from "../service/userService";

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password, role = "user" } = req.body;
    await userService.create({ username, role, password });
    res.status(201).json({ message: "usuario creado" });
  } catch (err: any) {
    console.error("Error en register:", err);
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const user = await userService.getByUsername(username);
    if (!user) {
      return res.status(404).json({ message: "username no encontrado" });
    }
    await userService.comparePassword(password, user.password);

    const payload = { id: user.id, username: user.username };
  const token = createToken(payload, "1h");
  // return token both in a header (legacy) and in the response body for robustness
  res.header("token", token).json({ user: payload, token });
  } catch (err: any) {
    console.error("Error en login:", err);
    next(err);
  }
};
