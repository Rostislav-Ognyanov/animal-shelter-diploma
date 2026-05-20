import mongoose from 'mongoose';

const contactInquirySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['adoption', 'volunteering', 'donation', 'general'],
    },
    name: {
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
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    species: {
      type: String,
      trim: true,
      default: '',
    },
    animalName: {
      type: String,
      trim: true,
      default: '',
    },
    availability: {
      type: String,
      trim: true,
      default: '',
    },
    donationTopic: {
      type: String,
      trim: true,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'under-review', 'resolved'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.ContactInquiry || mongoose.model('ContactInquiry', contactInquirySchema);
