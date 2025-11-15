import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { httpError } from "../errorHanddler";

export interface JwtPayload {
  id: number;
  username: string;
}

const verifyToken = (req: any, res: Response, next: NextFunction) => {
  // El token puede venir en la cabecera personalizada 'token' (legacy) o en
  // 'authorization: Bearer <token>' (estándar). Soportamos ambos para compatibilidad.
  let token = req.headers["token"] as string | undefined;
  if (!token) {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return next(httpError(401, "Token no provisto"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as JwtPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return next(httpError(403, "Token inválido"));
  }
};

export default verifyToken;