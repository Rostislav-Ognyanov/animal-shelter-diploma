import { useEffect, useRef } from 'react';

import { focusErrorFeedback } from '../lib/formFocus.js';

export function useErrorFeedbackFocus(errorMessage) {
  const errorFeedbackRef = useRef(null);

  useEffect(() => {
    if (errorMessage) {
      focusErrorFeedback(errorFeedbackRef);
    }
  }, [errorMessage]);

  return errorFeedbackRef;
}
