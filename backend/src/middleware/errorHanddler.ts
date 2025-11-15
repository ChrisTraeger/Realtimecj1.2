import { Request, Response, NextFunction } from "express";

// Agrega esta función
export const httpError = (status: number, message: string) => {
  const err = new Error(message) as any;
  err.status = status;
  return err;
};

const errorHanddler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error capturado:", err);
  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";
  res.status(status).json({ message });
};

export default errorHanddler;
