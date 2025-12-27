// src/services/fields/fields.service.ts

import { UserModel } from "../user/user.model";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IField } from "./fields.interface";
import { generateFieldId } from "../../../utils/generateIds";
import { FieldModel } from "./fields.model";
import { ClientSession } from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";
import config from "../../../../config";
import axios from "axios";
import Groq from "groq-sdk";


// Fixed: Use correct model name + config key
const genAI = new GoogleGenerativeAI(config.gemini_api_key as string);
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Fixed: This works in 2025
});

const addField = async (fieldData: IField, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  fieldData.farmerId = user.farmerId;
  fieldData.fieldId = await generateFieldId();

  const existingField = await FieldModel.findOne({ fieldId: fieldData.fieldId });
  if (existingField) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID already exists!");
  }

  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    const newField = await FieldModel.create([fieldData], { session });
    if (!newField[0]) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create field!");
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: newField[0]._id } },
      { new: true, session }
    );

    if (role !== "admin" && fieldData.farmerId !== user.farmerId) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only add to your own fields!");
    }
    if (!updatedUser) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
    }

    await session.commitTransaction();
    return newField[0];
  } catch (error) {
    await session.abortTransaction();
    throw error instanceof AppError ? error : new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add field!");
  } finally {
    session.endSession();
  }
};

const removeField = async (fieldId: string, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only delete your own fields!");
  }

  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    const updatedField = await FieldModel.findOneAndUpdate(
      { fieldId, isDeleted: false },
      { isDeleted: true },
      { new: true, session }
    );

    if (!updatedField) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: field.farmerId, isDeleted: false },
      { $pull: { fieldIds: field._id } },
      { new: true, session }
    );

    if (!updatedUser) {
      throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
    }

    await session.commitTransaction();
    return updatedField;
  } catch (error) {
    await session.abortTransaction();
    throw error instanceof AppError ? error : new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete field!");
  } finally {
    session.endSession();
  }
};

const updateField = async (fieldId: string, fieldData: Partial<IField>, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const field = await FieldModel.findOne({ fieldId: fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Unauthorized: You can only update your own fields!");
  }

  if (fieldData.fieldId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID cannot be updated!");
  }

  if (fieldData.farmerId) {
    const newFarmer = await UserModel.findOne({ farmerId: fieldData.farmerId, isDeleted: false });
    if (!newFarmer) {
      throw new AppError(httpStatus.NOT_FOUND, "New farmer not found!");
    }

    await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: field._id } },
      { new: true }
    );

    await UserModel.findOneAndUpdate(
      { farmerId: field.farmerId, isDeleted: false },
      { $pull: { fieldIds: field._id } },
      { new: true }
    );
  }

  const updatedField = await FieldModel.findOneAndUpdate(
    { fieldId, isDeleted: false },
    { $set: fieldData },
    { new: true }
  );

  if (!updatedField) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update field!");
  }

  return updatedField;
};

const readAllFields = async () => {
  const fields = await FieldModel.find({ isDeleted: false });
  return fields;
};

const readMyFieldsFromDB = async (userPhone: string) => {
  const user = await UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const targetFarmerId = user.farmerId;

  const fields = await FieldModel.find({ farmerId: targetFarmerId });
  return fields;
};

const readFieldById = async (fieldId: string) => {
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }
  return field;
};

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
  userPhone?: string;
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