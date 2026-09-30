import { sendCollectionSuccess, sendMutationSuccess } from '../../utils/apiResponse.js';
import {
  archiveRescueStory,
  createRescueStory,
  listPublishedRescueStories,
  listRescueStoryRecords,
  publishRescueStory,
  unpublishRescueStory,
  updateRescueStory,
} from './rescueStories.service.js';

export async function listPublishedRescueStoriesEntry(req, res, next) {
  try {
    const result = await listPublishedRescueStories(req.query);

    return sendCollectionSuccess(res, {
      message: 'Историите са заредени успешно.',
      items: result.items,
      total: result.total,
      meta: result.pagination
        ? {
            pagination: result.pagination,
          }
        : undefined,
    });
  } catch (error) {
    return next(error);
  }
}

export async function listRescueStoryRecordsEntry(req, res, next) {
  try {
    const stories = await listRescueStoryRecords(req.user);

    return sendCollectionSuccess(res, {
      message: 'Служебният списък с истории е зареден успешно.',
      items: stories,
      total: stories.length,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createRescueStoryEntry(req, res, next) {
  try {
    const story = await createRescueStory(req.body, req.user);

    return sendMutationSuccess(res, {
      status: 201,
      message: 'Историята е създадена успешно.',
      data: story,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateRescueStoryEntry(req, res, next) {
  try {
    const story = await updateRescueStory(req.params.storyId, req.body, req.user);

    return sendMutationSuccess(res, {
      message: 'Историята е обновена успешно.',
      data: story,
    });
  } catch (error) {
    return next(error);
  }
}

export async function publishRescueStoryEntry(req, res, next) {
  try {
    const story = await publishRescueStory(req.params.storyId, req.user);

    return sendMutationSuccess(res, {
      message: 'Историята е публикувана успешно.',
      data: story,
    });
  } catch (error) {
    return next(error);
  }
}

export async function unpublishRescueStoryEntry(req, res, next) {
  try {
    const story = await unpublishRescueStory(req.params.storyId, req.user);

    return sendMutationSuccess(res, {
      message: 'Историята е скрита от публичната част успешно.',
      data: story,
    });
  } catch (error) {
    return next(error);
  }
}

export async function archiveRescueStoryEntry(req, res, next) {
  try {
    const story = await archiveRescueStory(req.params.storyId, req.user);

    return sendMutationSuccess(res, {
      message: 'Историята е архивирана успешно.',
      data: story,
    });
  } catch (error) {
    return next(error);
  }
}
