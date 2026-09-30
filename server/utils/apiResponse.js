import { isPlainObject } from './object.js';

const DEFAULT_SUCCESS_MESSAGE = 'Заявката е обработена успешно.';
const DEFAULT_ERROR_MESSAGE = 'Възникна неочаквана грешка в сървъра.';


function sendSuccess(
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

function buildCollectionMeta(meta) {
  if (!isPlainObject(meta)) {
    return undefined;
  }

  const safeMeta = { ...meta };
  delete safeMeta.total;

  return Object.keys(safeMeta).length > 0 ? safeMeta : undefined;
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

  return sendSuccess(res, {
    status,
    message,
    data: {
      ...extraData,
      items,
      total,
    },
    meta: buildCollectionMeta(meta),
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
