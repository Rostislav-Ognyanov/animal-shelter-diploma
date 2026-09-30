import mongoose from 'mongoose';

import {
  NOTIFICATION_DEFINITIONS,
  NOTIFICATION_RESOURCE_TYPE_VALUES,
  NOTIFICATION_TEXT_LIMITS,
  NOTIFICATION_TYPE_VALUES,
  NOTIFICATION_RETENTION_SECONDS,
} from '../../shared/domain/notificationConstants.js';

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPE_VALUES,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_TEXT_LIMITS.title,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_TEXT_LIMITS.message,
    },
    resourceType: {
      type: String,
      required: true,
      enum: NOTIFICATION_RESOURCE_TYPE_VALUES,
    },
    resourceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_TEXT_LIMITS.resourceId,
    },
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: NOTIFICATION_TEXT_LIMITS.dedupeKey,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    lastTriggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.pre('validate', function validateNotificationResourceType() {
  const definition = NOTIFICATION_DEFINITIONS[this.type];

  if (definition && !this.resourceType) {
    this.resourceType = definition.resourceType;
  }

  if (definition && this.resourceType !== definition.resourceType) {
    this.invalidate('resourceType', 'Типът на ресурса не съответства на типа на известието.');
  }
});

notificationSchema.index({ recipient: 1, lastTriggeredAt: -1, _id: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, type: 1, resourceType: 1, resourceId: 1, isRead: 1 });
// Retention follows the most recent trigger, so refreshed notifications are not removed prematurely.
notificationSchema.index({ lastTriggeredAt: 1 }, { expireAfterSeconds: NOTIFICATION_RETENTION_SECONDS });
// Read notifications remain as history; uniqueness applies only while the matching notification is unread.
notificationSchema.index(
  { recipient: 1, dedupeKey: 1, isRead: 1 },
  {
    unique: true,
    partialFilterExpression: {
      dedupeKey: { $exists: true },
      isRead: false,
    },
  }
);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
