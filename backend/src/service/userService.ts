import prisma from "../config/database";
import bcrypt from "bcrypt";
import { httpError } from "../middleware/errorHanddler";  // ajustar ruta según proyecto

const SALT_ROUNDS = 10;

const userService = {
  async create(data: { username: string; role: string; password: string }) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing) {
      throw httpError(400, "Usuario ya existe");
    }
    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        role: data.role,
        password: hashed,
      },
    });
    return user;
  },

  async getByUsername(username: string) {
    return prisma.user.findUnique({ where: { username } });
  },

  async comparePassword(plain: string, hashed: string) {
    const ok = await bcrypt.compare(plain, hashed);
    if (!ok) {
      throw httpError(400, "Contraseña incorrecta");
    }
  },

  async getById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  async update(id: number, data: any) {
    return prisma.user.update({ where: { id }, data });
  },

  async delete(id: number) {
    await prisma.user.delete({ where: { id } });
  },
};

export default userService;
