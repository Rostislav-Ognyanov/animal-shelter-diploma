import mongoose from 'mongoose';

import {
  ADOPTION_ANIMAL_ALLERGY_VALUES,
  ADOPTION_ANIMAL_LIVING_PLACE_VALUES,
  ADOPTION_HOUSING_TYPE_VALUES,
  ADOPTION_MAX_OTHER_PETS,
  ADOPTION_OTHER_PET_CARE_STATUS_VALUES,
  ADOPTION_OTHER_PET_SEX_VALUES,
  ADOPTION_OTHER_PET_SPECIES_VALUES,
  ADOPTION_STATUS_VALUES,
  ADOPTION_TEXT_LIMITS,
  ADOPTION_TRANSPORT_VALUES,
  ADOPTION_YARD_SECURITY_VALUES,
  isValidAdoptionPhone,
} from '../../shared/domain/adoptionConstants.js';

const internalNoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADOPTION_TEXT_LIMITS.internalNote,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      trim: true,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      enum: ['', ...ADOPTION_STATUS_VALUES],
      default: '',
    },
    toStatus: {
      type: String,
      enum: ADOPTION_STATUS_VALUES,
      required: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByName: {
      type: String,
      trim: true,
      default: '',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const otherPetSchema = new mongoose.Schema(
  {
    species: {
      type: String,
      enum: ADOPTION_OTHER_PET_SPECIES_VALUES,
      required: true,
      trim: true,
    },
    otherSpecies: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    sex: {
      type: String,
      enum: ADOPTION_OTHER_PET_SEX_VALUES,
      required: true,
    },
    neuteringStatus: {
      type: String,
      enum: ADOPTION_OTHER_PET_CARE_STATUS_VALUES,
      required: true,
    },
    vaccinationStatus: {
      type: String,
      enum: ADOPTION_OTHER_PET_CARE_STATUS_VALUES,
      required: true,
    },
    approximateAge: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
  },
  {
    _id: false,
  }
);

otherPetSchema.path('otherSpecies').validate(function validateOtherSpecies(value) {
  return this.species !== 'other' || Boolean(String(value ?? '').trim());
}, 'При вид "Друго" трябва да бъде въведено уточнение.');

const adoptionRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    animal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Animal',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ADOPTION_STATUS_VALUES,
      required: true,
      default: 'pending',
      index: true,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
    },
    housingType: {
      type: String,
      enum: ADOPTION_HOUSING_TYPE_VALUES,
      required: true,
    },
    housingTypeOther: {
      type: String,
      trim: true,
      default: '',
      maxlength: 120,
    },
    hasYard: {
      type: Boolean,
      default: null,
    },
    yardSecurity: {
      type: String,
      enum: [...ADOPTION_YARD_SECURITY_VALUES, null],
      default: null,
    },
    animalLivingPlace: {
      type: String,
      enum: ADOPTION_ANIMAL_LIVING_PLACE_VALUES,
      required: true,
    },
    animalLivingPlaceOther: {
      type: String,
      trim: true,
      default: '',
      maxlength: 160,
    },
    householdMembersCount: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    hasAnimalAllergies: {
      type: String,
      enum: ADOPTION_ANIMAL_ALLERGY_VALUES,
      required: true,
    },
    hasOtherPets: {
      type: Boolean,
      required: true,
    },
    otherPets: {
      type: [otherPetSchema],
      default: [],
    },
    hasPreviousPetExperience: {
      type: Boolean,
      required: true,
    },
    previousPetExperienceDetails: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    acceptsUnexpectedMedicalCosts: {
      type: Boolean,
      required: true,
    },
    animalTransport: {
      type: String,
      enum: ADOPTION_TRANSPORT_VALUES,
      required: true,
    },
    contactPhone: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: isValidAdoptionPhone,
        message: 'Телефонът за връзка е невалиден.',
      },
    },
    internalNotes: {
      type: [internalNoteSchema],
      default: [],
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

adoptionRequestSchema.pre('validate', function normalizeConditionalAdoptionFields() {
  if (this.housingType !== 'other') {
    this.housingTypeOther = '';
  }

  if (this.housingType !== 'house') {
    this.hasYard = null;
    this.yardSecurity = null;
  }

  if (this.hasYard !== true) {
    this.yardSecurity = null;
  }

  if (this.animalLivingPlace !== 'other') {
    this.animalLivingPlaceOther = '';
  }

  if (this.hasOtherPets === false) {
    this.otherPets = [];
  }

  if (this.hasPreviousPetExperience === false) {
    this.previousPetExperienceDetails = '';
  }
});

adoptionRequestSchema.path('motivation').validate(function validateMotivation(value) {
  const text = String(value ?? '').trim();
  return text.length >= 20 && text.length <= 1500;
}, 'Мотивацията трябва да бъде между 20 и 1500 символа.');

adoptionRequestSchema.path('housingTypeOther').validate(function validateHousingTypeOther(value) {
  return this.housingType !== 'other' || Boolean(String(value ?? '').trim());
}, 'При тип жилище "Друго" трябва да бъде въведено уточнение.');

adoptionRequestSchema.path('hasYard').validate(function validateHasYard(value) {
  return this.housingType !== 'house' || typeof value === 'boolean';
}, 'При тип жилище "Къща" трябва да бъде посочено дали има двор.');

adoptionRequestSchema.path('yardSecurity').validate(function validateYardSecurity(value) {
  return this.housingType !== 'house' || this.hasYard !== true || Boolean(value);
}, 'При къща с двор трябва да бъде посочено дали дворът е обезопасен.');

adoptionRequestSchema.path('animalLivingPlace').validate(function validateAnimalLivingPlace(value) {
  if (value !== 'secured-yard') {
    return true;
  }

  return this.housingType === 'house' && this.hasYard === true && this.yardSecurity === 'secured';
}, 'Животното може да живее в обезопасен двор само при къща с потвърден обезопасен двор.');

adoptionRequestSchema.path('animalLivingPlaceOther').validate(function validateAnimalLivingPlaceOther(value) {
  return this.animalLivingPlace !== 'other' || Boolean(String(value ?? '').trim());
}, 'При място "Друго" трябва да бъде въведено уточнение.');

adoptionRequestSchema.path('otherPets').validate(function validateOtherPets(value) {
  if (this.hasOtherPets !== true) {
    return Array.isArray(value) && value.length === 0;
  }

  return Array.isArray(value) && value.length > 0;
}, 'При отговор "Да" за други животни трябва да бъде добавено поне едно животно.');

adoptionRequestSchema.path('otherPets').validate(function validateOtherPetsLimit(value) {
  return !Array.isArray(value) || value.length <= ADOPTION_MAX_OTHER_PETS;
}, `Могат да бъдат добавени най-много ${ADOPTION_MAX_OTHER_PETS} животни.`);

adoptionRequestSchema.index({ user: 1, animal: 1, status: 1 });
adoptionRequestSchema.index({ user: 1, status: 1, createdAt: -1 });
adoptionRequestSchema.index({ animal: 1, status: 1 });
adoptionRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.AdoptionRequest ||
  mongoose.model('AdoptionRequest', adoptionRequestSchema);
