export function createEmptyFeedback() {
  return {
    type: '',
    message: '',
  };
}

export function createSuccessFeedback(message) {
  if (!message) {
    return createEmptyFeedback();
  }

  return {
    type: 'success',
    message,
  };
}

export function createErrorFeedback(message) {
  if (!message) {
    return createEmptyFeedback();
  }

  return {
    type: 'error',
    message,
  };
}