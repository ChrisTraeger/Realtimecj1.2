import { z } from "zod";

// Nota: validaciones de contraseña relajadas para desarrollo a petición del usuario.
// Se exige únicamente que exista la contraseña (mínimo 1 carácter). Si se desea
// volver a endurecer la validación, reintroducir regex y min length.

export const userSchema = z.object({
  username: z.string().min(1, "username es requerido"),
  role: z.string().optional().default("user"),
  // Eliminada validación compleja; ahora solo se requiere que exista
  password: z.string().min(1, "password es requerido"),
});

export const loginSchema = z.object({
  username: z.string().min(1, "username es requerido"),
  password: z.string().min(1, "password es requerido"),
});

export const editUserSchema = z.object({
  username: z.string().min(1, "username es requerido").optional(),
  role: z.string().min(1, "role es requerido").optional(),
  // password opcional al editar; si se provee, solo se exige que no esté vacío
  password: z.string().min(1, "password no puede estar vacío").optional(),
});
