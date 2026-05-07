const DEFAULT_SUCCESS_MESSAGE = 'Заявката е обработена успешно.';
const DEFAULT_ERROR_MESSAGE = 'Възникна неочаквана грешка в сървъра.';

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sendSuccess(
  res,
  { status = 200, message = DEFAULT_SUCCESS_MESSAGE, data = null, meta } = {}
) {
  const payload = {
    success: true,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
}

export function sendCollectionSuccess(
  res,
  {
    status = 200,
    message = 'Списъкът е зареден успешно.',
    items = [],
    total = Array.isArray(items) ? items.length : 0,
    data = {},
    meta,
  } = {}
) {
  const extraData = isPlainObject(data) ? data : {};
  const collectionMeta = {
    total,
    ...(isPlainObject(meta) ? meta : {}),
  };

  return sendSuccess(res, {
    status,
    message,
    data: {
      ...extraData,
      items,
      total,
    },
    meta: collectionMeta,
  });
}

export function sendItemSuccess(
  res,
  { status = 200, message = 'Данните са заредени успешно.', data = null, meta } = {}
) {
  return sendSuccess(res, {
    status,
    message,
    data,
    meta,
  });
}

export function sendMutationSuccess(
  res,
  { status = 200, message = 'Операцията е изпълнена успешно.', data = null, meta } = {}
) {
  return sendSuccess(res, {
    status,
    message,
    data,
    meta,
  });
}

export function sendError(
  res,
  { status = 500, message = DEFAULT_ERROR_MESSAGE, details, code } = {}
) {
  const payload = {
    success: false,
    message,
  };

  if (code) {
    payload.code = code;
  }

  if (details !== undefined) {
    payload.details = details;
  }

  return res.status(status).json(payload);
}
