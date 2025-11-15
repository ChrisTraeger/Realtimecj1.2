import jwt from "jsonwebtoken";

interface Payload {
  id: number;
  username: string;
}

const createToken = (payload: Payload, _expiresIn: string) => {
  // jwt puede ser objeto con sign dentro de default (dependiendo de cómo se resuelva)
  return (jwt as any).sign(payload, process.env.JWT_SECRET || "secret");
};

export default createToken;
