const DEFAULT_HTTP_ERROR_MESSAGE = 'Възникна грешка при обработката на заявката.';

export function createHttpError(status, message = DEFAULT_HTTP_ERROR_MESSAGE, details, code) {
  const error = new Error(message);
  error.status = status;

  if (details !== undefined) {
    error.details = details;
  }

  if (code) {
    error.code = code;
  }

  return error;
}