import { getTerminalWorkflowStatusValues } from '../../shared/domain/workflowStatus.js';

const DEFAULT_SORT = Object.freeze({ createdAt: -1, _id: -1 });

function hasExplicitStatusFilter(query) {
  return Object.prototype.hasOwnProperty.call(query, 'status');
}

async function readQuerySlice({
  model,
  query,
  skip,
  limit,
  configureQuery,
}) {
  if (limit <= 0) {
    return [];
  }

  let databaseQuery = model.find(query).sort(DEFAULT_SORT).skip(skip).limit(limit);

  if (configureQuery) {
    databaseQuery = configureQuery(databaseQuery) ?? databaseQuery;
  }

  return databaseQuery.lean();
}

export async function readWorkflowCollectionPage({
  model,
  query,
  pagination,
  statusTransitions,
  configureQuery,
}) {
  const pageOffset = (pagination.page - 1) * pagination.limit;

  if (hasExplicitStatusFilter(query)) {
    return readQuerySlice({
      model,
      query,
      skip: pageOffset,
      limit: pagination.limit,
      configureQuery,
    });
  }

  // Split before pagination so active work cannot be pushed to later pages by newer terminal records.
  const terminalStatuses = getTerminalWorkflowStatusValues(statusTransitions);
  const activeQuery = {
    ...query,
    status: { $nin: terminalStatuses },
  };
  const terminalQuery = {
    ...query,
    status: { $in: terminalStatuses },
  };
  const activeTotal = await model.countDocuments(activeQuery);

  if (pageOffset >= activeTotal) {
    return readQuerySlice({
      model,
      query: terminalQuery,
      skip: pageOffset - activeTotal,
      limit: pagination.limit,
      configureQuery,
    });
  }

  const activeItems = await readQuerySlice({
    model,
    query: activeQuery,
    skip: pageOffset,
    limit: pagination.limit,
    configureQuery,
  });
  const remainingLimit = pagination.limit - activeItems.length;

  if (remainingLimit <= 0) {
    return activeItems;
  }

  const terminalItems = await readQuerySlice({
    model,
    query: terminalQuery,
    skip: 0,
    limit: remainingLimit,
    configureQuery,
  });

  return [...activeItems, ...terminalItems];
}
