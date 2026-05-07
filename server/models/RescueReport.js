import mongoose from 'mongoose';

import {
  RESCUE_REPORT_SPECIES_VALUES,
  RESCUE_REPORT_STATUS_VALUES,
  RESCUE_REPORT_URGENCY_VALUES,
} from '../modules/rescue-reports/rescueReport.constants.js';

const rescueReportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    species: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_SPECIES_VALUES,
      trim: true,
    },
    urgency: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_URGENCY_VALUES,
      trim: true,
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: RESCUE_REPORT_STATUS_VALUES,
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

export default mongoose.models.RescueReport || mongoose.model('RescueReport', rescueReportSchema);
