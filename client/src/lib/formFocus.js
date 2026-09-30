function getScrollBehavior() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function resolveNamedFormControl(formElement, fieldName) {
  const namedControl = formElement?.elements?.namedItem(fieldName);

  if (!namedControl) {
    return null;
  }

  if (typeof RadioNodeList !== 'undefined' && namedControl instanceof RadioNodeList) {
    return namedControl[0] ?? null;
  }

  return namedControl;
}

export function scrollAndFocusElement(element) {
  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior: getScrollBehavior(),
    block: 'start',
  });

  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

export function scheduleScrollAndFocus(resolveElement) {
  if (typeof window === 'undefined') {
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollAndFocusElement(resolveElement());
    });
  });
}

export function focusFirstInvalidField(formElement, validationErrors = {}, fieldAliases = {}) {
  const firstErrorKey = Object.keys(validationErrors)[0];

  if (!firstErrorKey) {
    return;
  }

  const fieldName = fieldAliases[firstErrorKey] ?? firstErrorKey;

  scheduleScrollAndFocus(
    () =>
      resolveNamedFormControl(formElement, fieldName) ??
      formElement?.querySelector('[aria-invalid="true"]') ??
      formElement?.querySelector(':invalid')
  );
}

export function focusErrorFeedback(feedbackRef) {
  scheduleScrollAndFocus(() => feedbackRef.current);
}
