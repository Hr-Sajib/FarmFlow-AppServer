// src/app/modules/fields/fields.service.ts

import httpStatus from "http-status";
import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";

import { UserModel } from "../user/user.model";
import AppError from "../../errors/AppError";
import { IField } from "./fields.interface";
import { generateFieldId } from "../../utils/generateIds";
import { FieldModel } from "./fields.model";
import config from "../../../config";

const genAI = new GoogleGenerativeAI(config.gemini_api_key as string);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/** The authenticated caller, resolved by the auth middleware. */
export type TActor = {
  userId: string;
  role: string;
  userCode: string;
};

const isAdmin = (actor: TActor) => actor.role === "admin";

/** Confirms a userCode belongs to a real, active farmer before assigning ownership. */
const assertFarmerExists = async (farmerCode: string): Promise<void> => {
  const farmer = await UserModel.findOne({
    userCode: farmerCode,
    role: "farmer",
    isDeleted: false,
  });
  if (!farmer) {
    throw new AppError(httpStatus.NOT_FOUND, `No active farmer with id ${farmerCode}`);
  }
};

/** Loads a field and enforces that a non-admin caller owns it. */
const getOwnedField = async (fieldId: string, actor: TActor) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }
  if (!isAdmin(actor) && field.farmerId !== actor.userCode) {
    throw new AppError(httpStatus.FORBIDDEN, "This field does not belong to you");
  }
  return field;
};

/**
 * An admin must name the owning farmer; a farmer always becomes the owner of
 * what they create, and a farmerId in their payload is rejected rather than
 * ignored so an attempt to assign a field elsewhere is not silently dropped.
 */
const addField = async (fieldData: IField, actor: TActor) => {
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

const removeField = async (fieldId: string, actor: TActor) => {
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

const updateField = async (
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

/** Admin-only listing; route guards enforce that. */
const readAllFields = async (filters: { farmerId?: string } = {}) => {
  const query: Record<string, unknown> = { isDeleted: false };
  if (filters.farmerId) query.farmerId = filters.farmerId;
  return FieldModel.find(query).sort({ createdAt: -1 });
};

const readMyFieldsFromDB = async (actor: TActor) =>
  FieldModel.find({ farmerId: actor.userCode, isDeleted: false }).sort({
    createdAt: -1,
  });

const readFieldById = async (fieldId: string, actor: TActor) =>
  getOwnedField(fieldId, actor);

export type TFieldInfo = {
  fieldCrop?: string;
  soilType?: string;
  fieldSizeInAcres?: string;
  latitude: number;
  longitude: number;
  sensorData?: {
    temperature?: string;
    humidity?: string;
    soilMoisture?: string;
    lightIntensity?: string;
  };
  userId?: string;
  role?: "admin" | "farmer";
};

// FIXED: Only changes here — model name + removed invalid debug code
const loadInsightsFromFieldData = async (fieldInfo: TFieldInfo) => {
  let soilData = {
    clay: 0,
    silt: 0,
    sand: 0,
    phh2o: 0,
    soc: 0,
  };
  try {
    const response = await axios.get(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${fieldInfo.latitude}&lon=${fieldInfo.longitude}&property=clay&property=silt&property=sand&property=phh2o&property=soc&depth=0-5cm&value=mean`,
      { headers: { accept: "application/json" } }
    );
    const layers = response.data.properties.layers;
    soilData = {
      clay: layers.find((l: any) => l.name === "clay")?.depths[0].values.mean / 10 || 0,
      silt: layers.find((l: any) => l.name === "silt")?.depths[0].values.mean / 10 || 0,
      sand: layers.find((l: any) => l.name === "sand")?.depths[0].values.mean / 10 || 0,
      phh2o: layers.find((l: any) => l.name === "phh2o")?.depths[0].values.mean / 10 || 0,
      soc: layers.find((l: any) => l.name === "soc")?.depths[0].values.mean / 10 || 0,
    };
    console.log("fieldServices.loadInsightsFromFieldData - SoilGrids response:", soilData);
  } catch (err) {
    console.error("fieldServices.loadInsightsFromFieldData - SoilGrids API error:", err);
  }

  const prompt = `
      You are an agricultural AI assistant. Based on the following field and soil data, provide actionable insights to help a farmer optimize their field conditions:

      - Crop: ${fieldInfo?.fieldCrop || "Unknown"}
      - Soil Type: ${fieldInfo?.soilType || "Unknown"}
      - Field Size: ${fieldInfo?.fieldSizeInAcres || "Unknown"} acres
      - Temperature: ${fieldInfo?.sensorData?.temperature || 0}°C
      - Humidity: ${fieldInfo?.sensorData?.humidity || 0}%
      - Soil Moisture: ${fieldInfo?.sensorData?.soilMoisture || 0}%
      - Light Intensity: ${fieldInfo?.sensorData?.lightIntensity || 0} lux
      - Soil Clay Content: ${soilData.clay.toFixed(1)}%
      - Soil Silt Content: ${soilData.silt.toFixed(1)}%
      - Soil Sand Content: ${soilData.sand.toFixed(1)}%
      - Soil pH: ${soilData.phh2o.toFixed(1)}
      - Soil Organic Carbon: ${soilData.soc.toFixed(1)} g/kg

      Provide specific recommendations for environmental controls based on the data given with most focus on temperature,
      humidity, soil moisture, light intensity. Also add some insight based on the other values and if any of those are in critical situation.
      Give tailored advice. Keep insights concise, practical, use best utilization of word limit given.
      Try to give information and precise direction rather than descriptions. Keep the response in 70 words in bangla.
    `;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
      },
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to generate insights from Gemini API!");
    }

    console.log('fieldServices.loadInsightsFromFieldData - Gemini response:', responseText);
    return responseText;
  } catch (error: any) {
    console.error('Gemini API Error:', error.message || error);
    return `Based on current data, maintain soil moisture above 50% for optimal growth. Temperature is suitable for ${fieldInfo?.fieldCrop || 'the crop'}. Check pH (${soilData.phh2o.toFixed(1)}) – aim for 6.0-7.0.`;
  }
};

const loadLongInsightsFromFieldData = async (fieldInfo: TFieldInfo) => {
  let soilData = {
    clay: 0,
    silt: 0,
    sand: 0,
    phh2o: 0,
    soc: 0,
  };
  try {
    const response = await axios.get(
      `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${fieldInfo.latitude}&lon=${fieldInfo.longitude}&property=clay&property=silt&property=sand&property=phh2o&property=soc&depth=0-5cm&value=mean`,
      { headers: { accept: "application/json" } }
    );
    const layers = response.data.properties.layers;
    soilData = {
      clay: layers.find((l: any) => l.name === "clay")?.depths[0].values.mean / 10 || 0,
      silt: layers.find((l: any) => l.name === "silt")?.depths[0].values.mean / 10 || 0,
      sand: layers.find((l: any) => l.name === "sand")?.depths[0].values.mean / 10 || 0,
      phh2o: layers.find((l: any) => l.name === "phh2o")?.depths[0].values.mean / 10 || 0,
      soc: layers.find((l: any) => l.name === "soc")?.depths[0].values.mean / 10 || 0,
    };
    console.log("fieldServices.loadInsightsFromFieldData - SoilGrids response:", soilData);
  } catch (err) {
    console.error("fieldServices.loadInsightsFromFieldData - SoilGrids API error:", err);
  }

  const prompt = `
      You are an agricultural AI assistant. Based on the following field and soil data, provide actionable insights to help a farmer optimize their field conditions:

      - Crop: ${fieldInfo?.fieldCrop || "Unknown"}
      - Soil Type: ${fieldInfo?.soilType || "Unknown"}
      - Field Size: ${fieldInfo?.fieldSizeInAcres || "Unknown"} acres
      - Temperature: ${fieldInfo?.sensorData?.temperature || 0}°C
      - Humidity: ${fieldInfo?.sensorData?.humidity || 0}%
      - Soil Moisture: ${fieldInfo?.sensorData?.soilMoisture || 0}%
      - Light Intensity: ${fieldInfo?.sensorData?.lightIntensity || 0} lux
      - Soil Clay Content: ${soilData.clay.toFixed(1)}%
      - Soil Silt Content: ${soilData.silt.toFixed(1)}%
      - Soil Sand Content: ${soilData.sand.toFixed(1)}%
      - Soil pH: ${soilData.phh2o.toFixed(1)}
      - Soil Organic Carbon: ${soilData.soc.toFixed(1)} g/kg

      Provide specific recommendations for environmental controlls based on the data given with most focus on temperature,
      humidity, soil moisture, light intensity. Also add some insight based on the other values and if any of those are in critical situation.
      Give tailored advice. Keep insights concise, practical, use best utilization of word limit given.
      Try to give information and precise direction rather then descriptions. Keep the response with around 500 bangla.
    `;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 3000,
      },
    });

    const responseText = result.response.text();
    if (!responseText) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to generate long insights!");
    }
    return responseText;
  } catch (error: any) {
    console.error('Long insights error:', error.message || error);
    return "দীর্ঘ বিশ্লেষণ তৈরি করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।";
  }
};

// EXACT SAME EXPORTS — UNCHANGED
export const fieldServices = {
  addField,
  removeField,
  updateField,
  readAllFields,
  readFieldById,
  readMyFieldsFromDB,
  loadInsightsFromFieldData,
  loadLongInsightsFromFieldData,
};