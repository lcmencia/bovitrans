/** Error de negocio de la capa de servicios, con status HTTP mapeable. */
export class ServiceError extends Error {
  constructor(
    public status: 400 | 404 | 409 | 422,
    message: string,
  ) {
    super(message);
  }
}
