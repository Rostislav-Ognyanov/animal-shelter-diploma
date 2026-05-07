import mongoose from 'mongoose';

import {
  VOLUNTEER_APPLICATION_STATUS_VALUES,
  VOLUNTEER_POSITION_VALUES,
} from '../modules/volunteers/volunteer.constants.js';

const volunteerApplicationSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    guardianConsent: {
      type: Boolean,
      default: false,
    },
    guardianName: {
      type: String,
      trim: true,
      default: '',
    },
    guardianContact: {
      type: String,
      trim: true,
      default: '',
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
    },
    experience: {
      type: String,
      trim: true,
      default: '',
    },
    availability: {
      type: String,
      required: true,
      trim: true,
    },
    preferredPositions: {
      type: [String],
      enum: VOLUNTEER_POSITION_VALUES,
      default: [],
    },
    otherPosition: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: VOLUNTEER_APPLICATION_STATUS_VALUES,
      required: true,
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.VolunteerApplication ||
  mongoose.model('VolunteerApplication', volunteerApplicationSchema);
