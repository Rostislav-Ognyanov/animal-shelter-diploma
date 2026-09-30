const REGRESSION_DATABASE_MARKER = /(^|[_-])regression($|[_-])/i;

export function assertRegressionDatabase(connection) {
  const databaseName = String(connection?.name ?? '').trim();

  if (!REGRESSION_DATABASE_MARKER.test(databaseName)) {
    throw new Error(
      `Regression check отказа да изтрие база "${databaseName || '(неизвестна)'}".`
    );
  }

  return databaseName;
}
