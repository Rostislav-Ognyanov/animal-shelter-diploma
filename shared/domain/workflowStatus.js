export function getTerminalWorkflowStatusValues(statusTransitions = {}) {
  return Object.freeze(
    Object.entries(statusTransitions)
      .filter(([, nextStatuses]) => Array.isArray(nextStatuses) && nextStatuses.length === 0)
      .map(([status]) => status)
  );
}

export function isTerminalWorkflowStatus(status, statusTransitions = {}) {
  return (
    Object.prototype.hasOwnProperty.call(statusTransitions, status) &&
    Array.isArray(statusTransitions[status]) &&
    statusTransitions[status].length === 0
  );
}
