import { UserModel } from "../user/user.model";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import { IField } from "./fields.interface";
import { generateFieldId } from "../../../utils/generateIds";
import { FieldModel } from "./fields.model";
import { ClientSession } from "mongoose";
import {
  GoogleGenerativeAI
} from "@google/generative-ai";
import config from "../../../../config";
import axios from "axios";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: config.groq_api_key });

const genAI = new GoogleGenerativeAI(config.gemini_api_key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const addField = async (fieldData: IField, userPhone: string, role: string) => {
  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Generate unique fieldId and pull farmerId
  fieldData.farmerId = user.farmerId;
  fieldData.fieldId = await generateFieldId();

  const existingField = await FieldModel.findOne({
    fieldId: fieldData.fieldId,
  });
  if (existingField) {
    throw new AppError(httpStatus.BAD_REQUEST, "Field ID already exists!");
  }

  // Start a transaction
  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    // Create the new field
    const newField = await FieldModel.create([fieldData], { session });
    if (!newField[0]) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create field!"
      );
    }

    // Update the user's fieldIds array with the new field's _id
    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: newField[0]._id } },
      { new: true, session }
    );

    if (role !== "admin" && fieldData.farmerId !== user.farmerId) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: You can only add to your own fields!"
      );
    }
    if (!updatedUser) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to update user's fieldIds!"
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    return newField[0];
  } catch (error) {
    // Rollback the transaction
    await session.abortTransaction();
    throw error instanceof AppError
      ? error
      : new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to add field!");
  } finally {
    session.endSession();
  }
};

// Soft delete a field with transaction
const removeField = async (
  fieldId: string,
  userPhone: string,
  role: string
) => {
  // Verify the user exists and is not deleted
  const user = await UserModel.findOne({ phone: userPhone, isDeleted: false });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  // Find the field
  const field = await FieldModel.findOne({ fieldId, isDeleted: false });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  // Check if the user is authorized (admin or the field's farmer)
  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Unauthorized: You can only delete your own fields!"
    );
  }

  // Start a transaction
  const session: ClientSession = await FieldModel.startSession();
  try {
    session.startTransaction();

    // Perform soft delete
    const updatedField = await FieldModel.findOneAndUpdate(
      { fieldId, isDeleted: false },
      { isDeleted: true },
      { new: true, session }
    );

    if (!updatedField) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to delete field!"
      );
    }

    // Remove the field's _id from the user's fieldIds
    const updatedUser = await UserModel.findOneAndUpdate(
      { farmerId: field.farmerId, isDeleted: false },
      { $pull: { fieldIds: field._id } },
      { new: true, session }
    );

    if (!updatedUser) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to update user's fieldIds!"
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    return updatedField;
  } catch (error) {
    // Rollback the transaction
    await session.abortTransaction();
    throw error instanceof AppError
      ? error
      : new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "Failed to delete field!"
        );
  } finally {
    session.endSession();
  }
};

// Update a field
const updateField = async (
  fieldId: string,
  fieldData: Partial<IField>,
  userPhone: string,
  role: string
) => {
  const user = await UserModel.findOne({ phone: userPhone }).where({
    isDeleted: false,
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const field = await FieldModel.findOne({
    fieldId: fieldId,
    isDeleted: false,
  });
  if (!field) {
    throw new AppError(httpStatus.NOT_FOUND, "Field not found!");
  }

  if (role !== "admin" && field.farmerId !== user.farmerId) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Unauthorized: You can only update your own fields!"
    );
  }

  // Handle fieldId updates
  if (fieldData.fieldId && role == 'admin') {
      const existingField = await FieldModel.findOne({
        fieldId: fieldData.fieldId,
        _id: { $ne: field._id }, 
        isDeleted: false,
      });
      if (existingField) {
        throw new AppError(httpStatus.BAD_REQUEST, "Field ID already exists!");
    }
  }

  // Handle farmerId updates
  if (fieldData.farmerId) {
    if (role !== "admin") {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "Unauthorized: Only admins can update farmer ID!"
      );
    }
    const newFarmer = await UserModel.findOne({
      farmerId: fieldData.farmerId,
      isDeleted: false,
    });
    if (!newFarmer) {
      throw new AppError(httpStatus.NOT_FOUND, "New farmer not found!");
    }

    // Update the new user's fieldIds
    await UserModel.findOneAndUpdate(
      { farmerId: fieldData.farmerId, isDeleted: false },
      { $addToSet: { fieldIds: field._id } },
      { new: true }
    );

    // Remove fieldId from the previous user's fieldIds
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
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to update field!"
    );
  }

  return updatedField;
};

export { updateField };

// Read all fields
const readAllFields = async () => {
  const fields = await FieldModel.find({ isDeleted: false });
  return fields;
};

const readMyFieldsFromDB = async (userPhone: string) => {
  const user = await UserModel.findOne({ phone: userPhone }).where({
    isDeleted: false,
  });
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  const targetFarmerId = user.farmerId;

  if (targetFarmerId !== "fr0") {
    const fields = await FieldModel.find({ farmerId: targetFarmerId });
    return fields;
  } else {
    const fields = await FieldModel.find();
    return fields;
  }
};

// Read a specific field by fieldId
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

// const loadInsightsFromFieldData = async (fieldInfo: TFieldInfo) => {
//   // Fetch soil data from SoilGrids API
//   let soilData = {
//     clay: 0,
//     silt: 0,
//     sand: 0,
//     phh2o: 0,
//     soc: 0,
//   };
//   try {
//     const response = await axios.get(
//       `https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${fieldInfo.latitude}&lon=${fieldInfo.longitude}&property=clay&property=silt&property=sand&property=phh2o&property=soc&depth=0-5cm&value=mean`,
//       { headers: { accept: 'application/json' } }
//     );
//     const layers = response.data.properties.layers;
//     soilData = {
//       clay: layers.find((l: any) => l.name === 'clay')?.depths[0].values.mean / 10 || 0, // Convert g/kg to %
//       silt: layers.find((l: any) => l.name === 'silt')?.depths[0].values.mean / 10 || 0, // Convert g/kg to %
//       sand: layers.find((l: any) => l.name === 'sand')?.depths[0].values.mean / 10 || 0, // Convert g/kg to %
//       phh2o: layers.find((l: any) => l.name === 'phh2o')?.depths[0].values.mean / 10 || 0, // Convert pH*10 to pH
//       soc: layers.find((l: any) => l.name === 'soc')?.depths[0].values.mean / 10 || 0, // Convert dg/kg to g/kg
//     };
//     console.log('fieldServices.loadInsightsFromFieldData - SoilGrids response:', soilData);
//   } catch (err) {
//     console.error('fieldServices.loadInsightsFromFieldData - SoilGrids API error:', err);
//     // Continue with default values if API fails
//   }

//   const prompt = `
//       You are an agricultural AI assistant. Based on the following field and soil data, provide actionable insights to help a farmer optimize their field conditions:

//       - Crop: ${fieldInfo?.fieldCrop || 'Unknown'}
//       - Soil Type: ${fieldInfo?.soilType || 'Unknown'}
//       - Field Size: ${fieldInfo?.fieldSizeInAcres || 'Unknown'} acres
//       - Temperature: ${(fieldInfo?.sensorData?.temperature || 0)}°C
//       - Humidity: ${(fieldInfo?.sensorData?.humidity || 0)}%
//       - Soil Moisture: ${(fieldInfo?.sensorData?.soilMoisture || 0)}%
//       - Light Intensity: ${(fieldInfo?.sensorData?.lightIntensity || 0)} lux
//       - Soil Clay Content: ${soilData.clay.toFixed(1)}%
//       - Soil Silt Content: ${soilData.silt.toFixed(1)}%
//       - Soil Sand Content: ${soilData.sand.toFixed(1)}%
//       - Soil pH: ${soilData.phh2o.toFixed(1)}
//       - Soil Organic Carbon: ${soilData.soc.toFixed(1)} g/kg

//       Provide specific recommendations for environmental controlls based on the data given with most focus on temperature,
//       humidity, soil moisture, light intensity. Also add some insight based on the other values and if any of those are in critical situation.
//       Give tailored advice. Keep insights concise, practical, use best utilization of word limit given.
//       Try to give information and precise direction rather then descriptions. Keep the response within 200 words all in bangla and make sure sentences are not cut off at the ending.
//     `;

//   console.log('fieldServices.loadInsightsFromFieldData - Prompt:', prompt);

//   // Call Groq API
//   try {
//     const completion = await groq.chat.completions.create({
//       model: 'llama3-70b-8192',
//       messages: [{ role: 'user', content: prompt }],
//       temperature: 0.7,
//       max_tokens: 400, // ~100 words (assuming ~4 tokens/word)
//     });

//     const responseText = completion.choices[0]?.message?.content;
//     if (!responseText) {
//       throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate insights from Groq API!');
//     }

//     console.log('fieldServices.loadInsightsFromFieldData - Groq response:', responseText);
//     return responseText;
//   } catch (err) {
//     console.error('fieldServices.loadInsightsFromFieldData - Groq API error:', err);
//     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate insights from Groq API!');
//   }
// };

const loadInsightsFromFieldData = async (fieldInfo: TFieldInfo) => {
  // Find the field

  // Fetch soil data from SoilGrids API
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
      clay:
        layers.find((l: any) => l.name === "clay")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      silt:
        layers.find((l: any) => l.name === "silt")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      sand:
        layers.find((l: any) => l.name === "sand")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      phh2o:
        layers.find((l: any) => l.name === "phh2o")?.depths[0].values.mean /
          10 || 0, // Convert pH*10 to pH
      soc:
        layers.find((l: any) => l.name === "soc")?.depths[0].values.mean / 10 ||
        0, // Convert dg/kg to g/kg
    };
    console.log(
      "fieldServices.loadInsightsFromFieldData - SoilGrids response:",
      soilData
    );
  } catch (err) {
    console.error(
      "fieldServices.loadInsightsFromFieldData - SoilGrids API error:",
      err
    );
    // Continue with default values if API fails
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
      Try to give information and precise direction rather then descriptions. Keep the response within 200 bangla.
    `;

  // console.log('Prompt________', prompt);

  // Call Gemini API (non-streaming)
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1600, // ~400 words (assuming 4 tokens/word)
    },
  });

  // const responseText = "no res";
  const responseText = result.response.text();
  if (!responseText) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate insights from Gemini API!"
    );
  }

  // console.log('fieldServices.loadInsightsFromFieldData - Gemini response:', responseText);
  return responseText;
};

const loadLongInsightsFromFieldData = async (fieldInfo: TFieldInfo) => {
  // Find the field

  // Fetch soil data from SoilGrids API
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
      clay:
        layers.find((l: any) => l.name === "clay")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      silt:
        layers.find((l: any) => l.name === "silt")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      sand:
        layers.find((l: any) => l.name === "sand")?.depths[0].values.mean /
          10 || 0, // Convert g/kg to %
      phh2o:
        layers.find((l: any) => l.name === "phh2o")?.depths[0].values.mean /
          10 || 0, // Convert pH*10 to pH
      soc:
        layers.find((l: any) => l.name === "soc")?.depths[0].values.mean / 10 ||
        0, // Convert dg/kg to g/kg
    };
    console.log(
      "fieldServices.loadInsightsFromFieldData - SoilGrids response:",
      soilData
    );
  } catch (err) {
    console.error(
      "fieldServices.loadInsightsFromFieldData - SoilGrids API error:",
      err
    );
    // Continue with default values if API fails
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

  // Call Gemini API (non-streaming)
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1600, // ~400 words (assuming 4 tokens/word)
    },
  });

  // const responseText = "no res";
  const responseText = result.response.text();
  if (!responseText) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to generate insights from Gemini API!"
    );
  }

  // console.log('fieldServices.loadInsightsFromFieldData - Gemini response:', responseText);
  return responseText;
};

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
