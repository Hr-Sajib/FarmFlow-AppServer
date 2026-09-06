// src/app/modules/fields/fields.service.ts

import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { IField } from "./fields.interface";
import { FieldModel } from "./fields.model";
import { generateFieldId } from "../../utils/generateIds";
import {
  TActor,
  isAdmin,
  assertFarmerExists,
  getOwnedField,
  getSoilProfile,
  getLatestReadingForField,
  buildFieldInsightPrompt,
} from "./fields.utils";
import { fetchWeatherForCoordinates } from "../../utils/openMeteo";
import { createChatCompletion } from "../../utils/openRouter";

/**
 * An admin must name the owning farmer; a farmer always becomes the owner of
 * what they create, and a farmerId in their payload is rejected rather than
 * ignored so an attempt to assign a field elsewhere is not silently dropped.
 */
const createFieldIntoDB = async (fieldData: IField, actor: TActor) => {
  if (isAdmin(actor)) {
    if (!fieldData.farmerId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "farmerId is required when an admin creates a field"
      );
    }
    await assertFarmerExists(fieldData.farmerId);
  } else {
    if (fieldData.farmerId && fieldData.farmerId !== actor.userCode) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only create fields for yourself"
      );
    }
    fieldData.farmerId = actor.userCode;
  }

  fieldData.fieldId = await generateFieldId();

  return FieldModel.create(fieldData);
};

const getAllFieldsFromDB = async (filters: { farmerId?: string } = {}) => {
  const query: Record<string, unknown> = { isDeleted: false };
  if (filters.farmerId) query.farmerId = filters.farmerId;
  return FieldModel.find(query).sort({ createdAt: -1 });
};

const getMyFieldsFromDB = async (actor: TActor) =>
  FieldModel.find({ farmerId: actor.userCode, isDeleted: false }).sort({
    createdAt: -1,
  });

const getFieldByIdFromDB = async (fieldId: string, actor: TActor) =>
  getOwnedField(fieldId, actor);

const updateFieldData = async (
  fieldId: string,
  fieldData: Partial<IField>,
  actor: TActor
) => {
  await getOwnedField(fieldId, actor);

  if (fieldData.fieldId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID cannot be updated!");
  }

  // Reassigning a field to another farmer is an ownership transfer, so it is
  // restricted to admins.
  if (fieldData.farmerId) {
    if (!isAdmin(actor)) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only an admin can transfer a field to another farmer"
      );
    }
    await assertFarmerExists(fieldData.farmerId);
  }

  const updated = await FieldModel.findOneAndUpdate(
    { fieldId, isDeleted: false },
    { $set: fieldData },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update field!");
  }
  return updated;
};

const softDeleteFieldInDB = async (fieldId: string, actor: TActor) => {
  await getOwnedField(fieldId, actor);

  const deleted = await FieldModel.findOneAndUpdate(
    { fieldId, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );

  if (!deleted) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
  }
  return deleted;
};

/**
 * Current conditions and forecast for the field's own coordinates.
 *
 * Ownership is checked first, so weather cannot be used to probe whether a
 * given field id exists. The upstream call is cached by coordinate, so several
 * fields on one farm cost a single request.
 */
const getFieldWeather = async (fieldId: string, actor: TActor) => {
  const field = await getOwnedField(fieldId, actor);

  const weather = await fetchWeatherForCoordinates(
    field.fieldLocation.latitude,
    field.fieldLocation.longitude
  );

  return {
    fieldId: field.fieldId,
    fieldName: field.fieldName,
    ...weather,
  };
};

/**
 * Field advisory: what to do about this field, right now.
 *
 * Combines the crop and environment on record, the most recent sensor reading,
 * the SoilGrids profile, and the short-range forecast for the field's
 * coordinates — so "irrigate now" can account for rain landing in six hours.
 * Written to be read in a card, so the short form is deliberately tight.
 */
const getFieldInsight = async (
  fieldId: string,
  actor: TActor,
  detail: "brief" | "full" = "brief"
) => {
  const field = await getOwnedField(fieldId, actor);

  const [latest, soil, weather] = await Promise.all([
    getLatestReadingForField(field.fieldId),
    getSoilProfile(
      field.fieldLocation.latitude,
      field.fieldLocation.longitude
    ),
    // Forecast is enriching context, like soil: an outage degrades the advice
    // rather than failing the whole request.
    fetchWeatherForCoordinates(
      field.fieldLocation.latitude,
      field.fieldLocation.longitude
    ).catch(() => null),
  ]);

  const prompt = buildFieldInsightPrompt(field, latest, soil, weather, detail);

  const insight = await createChatCompletion(prompt, {
    maxTokens: detail === "brief" ? 320 : 1000,
    temperature: 0.35,
  });

  return {
    fieldId: field.fieldId,
    detail,
    generatedAt: new Date().toISOString(),
    basedOn: {
      reading: latest,
      soil,
      weather: weather
        ? { current: weather.current, daily: weather.daily.slice(0, 3) }
        : null,
    },
    insight,
  };
};

/**
 * Everything about a field at one instant, for attaching to a conversation or
 * a post.
 *
 * Assembled server-side and stored as a value, not as a reference: an advisory
 * thread read six months later should show the readings the farmer was looking
 * at when they asked, not today's. A live lookup would quietly rewrite the
 * question's context.
 */
const getFieldSnapshot = async (fieldId: string, actor: TActor) => {
  const field = await getOwnedField(fieldId, actor);

  const [reading, soil, weather] = await Promise.all([
    getLatestReadingForField(field.fieldId),
    getSoilProfile(field.fieldLocation.latitude, field.fieldLocation.longitude),
    fetchWeatherForCoordinates(
      field.fieldLocation.latitude,
      field.fieldLocation.longitude
    ).catch(() => null),
  ]);

  return {
    capturedAt: new Date().toISOString(),
    field: {
      fieldId: field.fieldId,
      fieldName: field.fieldName,
      fieldCrop: field.fieldCrop,
      environmentType: field.environmentType,
      soilType: field.soilType,
      fieldSizeInAcres: field.fieldSizeInAcres,
      region: field.region,
      location: field.fieldLocation,
    },
    reading,
    soil,
    weather: weather
      ? {
          current: weather.current,
          units: weather.units,
          timezone: weather.timezone,
          // Three days is what fits a card without it becoming a forecast app.
          daily: (weather.daily ?? []).slice(0, 3),
        }
      : null,
  };
};

export const fieldServices = {
  getFieldSnapshot,
  createFieldIntoDB,
  getAllFieldsFromDB,
  getMyFieldsFromDB,
  getFieldByIdFromDB,
  updateFieldData,
  softDeleteFieldInDB,
  getFieldWeather,
  getFieldInsight,
};
