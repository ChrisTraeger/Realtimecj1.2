class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    // Esto es importante cuando extiendes Error en TS/ES: restaurar prototipo
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export default HttpError;
