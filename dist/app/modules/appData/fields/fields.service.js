"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fieldServices = void 0;
const user_model_1 = require("../user/user.model");
const AppError_1 = __importDefault(require("../../../errors/AppError"));
const http_status_1 = __importDefault(require("http-status"));
const generateIds_1 = require("../../../utils/generateIds");
const fields_model_1 = require("./fields.model");
const generative_ai_1 = require("@google/generative-ai");
const config_1 = __importDefault(require("../../../../config"));
const axios_1 = __importDefault(require("axios"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const groq = new groq_sdk_1.default({ apiKey: config_1.default.groq_api_key });
const genAI = new generative_ai_1.GoogleGenerativeAI(config_1.default.gemini_api_key);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const addField = (fieldData, userPhone, role) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone, isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    // Generate unique fieldId and pull farmerId
    fieldData.farmerId = user.farmerId;
    fieldData.fieldId = yield (0, generateIds_1.generateFieldId)();
    const existingField = yield fields_model_1.FieldModel.findOne({ fieldId: fieldData.fieldId });
    if (existingField) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Field ID already exists!");
    }
    // Start a transaction
    const session = yield fields_model_1.FieldModel.startSession();
    try {
        session.startTransaction();
        // Create the new field
        const newField = yield fields_model_1.FieldModel.create([fieldData], { session });
        if (!newField[0]) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to create field!");
        }
        // Update the user's fieldIds array with the new field's _id
        const updatedUser = yield user_model_1.UserModel.findOneAndUpdate({ farmerId: fieldData.farmerId, isDeleted: false }, { $addToSet: { fieldIds: newField[0]._id } }, { new: true, session });
        if (role !== "admin" && fieldData.farmerId !== user.farmerId) {
            throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: You can only add to your own fields!");
        }
        if (!updatedUser) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
        }
        // Commit the transaction
        yield session.commitTransaction();
        return newField[0];
    }
    catch (error) {
        // Rollback the transaction
        yield session.abortTransaction();
        throw error instanceof AppError_1.default ? error : new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to add field!");
    }
    finally {
        session.endSession();
    }
});
// Soft delete a field with transaction
const removeField = (fieldId, userPhone, role) => __awaiter(void 0, void 0, void 0, function* () {
    // Verify the user exists and is not deleted
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone, isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    // Find the field
    const field = yield fields_model_1.FieldModel.findOne({ fieldId, isDeleted: false });
    if (!field) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Field not found!");
    }
    // Check if the user is authorized (admin or the field's farmer)
    if (role !== "admin" && field.farmerId !== user.farmerId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: You can only delete your own fields!");
    }
    // Start a transaction
    const session = yield fields_model_1.FieldModel.startSession();
    try {
        session.startTransaction();
        // Perform soft delete
        const updatedField = yield fields_model_1.FieldModel.findOneAndUpdate({ fieldId, isDeleted: false }, { isDeleted: true }, { new: true, session });
        if (!updatedField) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to delete field!");
        }
        // Remove the field's _id from the user's fieldIds
        const updatedUser = yield user_model_1.UserModel.findOneAndUpdate({ farmerId: field.farmerId, isDeleted: false }, { $pull: { fieldIds: field._id } }, { new: true, session });
        if (!updatedUser) {
            throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update user's fieldIds!");
        }
        // Commit the transaction
        yield session.commitTransaction();
        return updatedField;
    }
    catch (error) {
        // Rollback the transaction
        yield session.abortTransaction();
        throw error instanceof AppError_1.default ? error : new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to delete field!");
    }
    finally {
        session.endSession();
    }
});
// Update a field
const updateField = (fieldId, fieldData, userPhone, role) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    console.log("Field id searching: ", fieldData.fieldId);
    const field = yield fields_model_1.FieldModel.findOne({ fieldId: fieldId, isDeleted: false });
    if (!field) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Field not found!");
    }
    if (role !== "admin" && field.farmerId !== user.farmerId) {
        throw new AppError_1.default(http_status_1.default.UNAUTHORIZED, "Unauthorized: You can only update your own fields!");
    }
    if (fieldData.fieldId) {
        throw new AppError_1.default(http_status_1.default.BAD_REQUEST, "Field ID cannot be updated!");
    }
    if (fieldData.farmerId) {
        const newFarmer = yield user_model_1.UserModel.findOne({ farmerId: fieldData.farmerId, isDeleted: false });
        if (!newFarmer) {
            throw new AppError_1.default(http_status_1.default.NOT_FOUND, "New farmer not found!");
        }
        // Update the new user's fieldIds
        yield user_model_1.UserModel.findOneAndUpdate({ farmerId: fieldData.farmerId, isDeleted: false }, { $addToSet: { fieldIds: field._id } }, { new: true });
        // Remove fieldId from the previous user's fieldIds
        yield user_model_1.UserModel.findOneAndUpdate({ farmerId: field.farmerId, isDeleted: false }, { $pull: { fieldIds: field._id } }, { new: true });
    }
    const updatedField = yield fields_model_1.FieldModel.findOneAndUpdate({ fieldId, isDeleted: false }, { $set: fieldData }, { new: true });
    if (!updatedField) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to update field!");
    }
    return updatedField;
});
// Read all fields
const readAllFields = () => __awaiter(void 0, void 0, void 0, function* () {
    const fields = yield fields_model_1.FieldModel.find({ isDeleted: false });
    return fields;
});
const readMyFieldsFromDB = (userPhone) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield user_model_1.UserModel.findOne({ phone: userPhone }).where({ isDeleted: false });
    if (!user) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "User not found!");
    }
    const targetFarmerId = user.farmerId;
    const fields = yield fields_model_1.FieldModel.find({ farmerId: targetFarmerId });
    return fields;
});
// Read a specific field by fieldId
const readFieldById = (fieldId) => __awaiter(void 0, void 0, void 0, function* () {
    const field = yield fields_model_1.FieldModel.findOne({ fieldId, isDeleted: false });
    if (!field) {
        throw new AppError_1.default(http_status_1.default.NOT_FOUND, "Field not found!");
    }
    return field;
});
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
const loadInsightsFromFieldData = (fieldInfo) => __awaiter(void 0, void 0, void 0, function* () {
    // Find the field
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Fetch soil data from SoilGrids API
    let soilData = {
        clay: 0,
        silt: 0,
        sand: 0,
        phh2o: 0,
        soc: 0,
    };
    try {
        const response = yield axios_1.default.get(`https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${fieldInfo.latitude}&lon=${fieldInfo.longitude}&property=clay&property=silt&property=sand&property=phh2o&property=soc&depth=0-5cm&value=mean`, { headers: { accept: 'application/json' } });
        const layers = response.data.properties.layers;
        soilData = {
            clay: ((_a = layers.find((l) => l.name === 'clay')) === null || _a === void 0 ? void 0 : _a.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            silt: ((_b = layers.find((l) => l.name === 'silt')) === null || _b === void 0 ? void 0 : _b.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            sand: ((_c = layers.find((l) => l.name === 'sand')) === null || _c === void 0 ? void 0 : _c.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            phh2o: ((_d = layers.find((l) => l.name === 'phh2o')) === null || _d === void 0 ? void 0 : _d.depths[0].values.mean) / 10 || 0, // Convert pH*10 to pH
            soc: ((_e = layers.find((l) => l.name === 'soc')) === null || _e === void 0 ? void 0 : _e.depths[0].values.mean) / 10 || 0, // Convert dg/kg to g/kg
        };
        console.log('fieldServices.loadInsightsFromFieldData - SoilGrids response:', soilData);
    }
    catch (err) {
        console.error('fieldServices.loadInsightsFromFieldData - SoilGrids API error:', err);
        // Continue with default values if API fails
    }
    const prompt = `
      You are an agricultural AI assistant. Based on the following field and soil data, provide actionable insights to help a farmer optimize their field conditions:

      - Crop: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.fieldCrop) || 'Unknown'}
      - Soil Type: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.soilType) || 'Unknown'}
      - Field Size: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.fieldSizeInAcres) || 'Unknown'} acres
      - Temperature: ${(((_f = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _f === void 0 ? void 0 : _f.temperature) || 0)}°C
      - Humidity: ${(((_g = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _g === void 0 ? void 0 : _g.humidity) || 0)}%
      - Soil Moisture: ${(((_h = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _h === void 0 ? void 0 : _h.soilMoisture) || 0)}%
      - Light Intensity: ${(((_j = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _j === void 0 ? void 0 : _j.lightIntensity) || 0)} lux
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
    const result = yield model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1600, // ~400 words (assuming 4 tokens/word)
        },
    });
    // const responseText = "no res";
    const responseText = result.response.text();
    if (!responseText) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to generate insights from Gemini API!");
    }
    // console.log('fieldServices.loadInsightsFromFieldData - Gemini response:', responseText);
    return responseText;
});
const loadLongInsightsFromFieldData = (fieldInfo) => __awaiter(void 0, void 0, void 0, function* () {
    // Find the field
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    // Fetch soil data from SoilGrids API
    let soilData = {
        clay: 0,
        silt: 0,
        sand: 0,
        phh2o: 0,
        soc: 0,
    };
    try {
        const response = yield axios_1.default.get(`https://rest.isric.org/soilgrids/v2.0/properties/query?lat=${fieldInfo.latitude}&lon=${fieldInfo.longitude}&property=clay&property=silt&property=sand&property=phh2o&property=soc&depth=0-5cm&value=mean`, { headers: { accept: 'application/json' } });
        const layers = response.data.properties.layers;
        soilData = {
            clay: ((_a = layers.find((l) => l.name === 'clay')) === null || _a === void 0 ? void 0 : _a.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            silt: ((_b = layers.find((l) => l.name === 'silt')) === null || _b === void 0 ? void 0 : _b.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            sand: ((_c = layers.find((l) => l.name === 'sand')) === null || _c === void 0 ? void 0 : _c.depths[0].values.mean) / 10 || 0, // Convert g/kg to %
            phh2o: ((_d = layers.find((l) => l.name === 'phh2o')) === null || _d === void 0 ? void 0 : _d.depths[0].values.mean) / 10 || 0, // Convert pH*10 to pH
            soc: ((_e = layers.find((l) => l.name === 'soc')) === null || _e === void 0 ? void 0 : _e.depths[0].values.mean) / 10 || 0, // Convert dg/kg to g/kg
        };
        console.log('fieldServices.loadInsightsFromFieldData - SoilGrids response:', soilData);
    }
    catch (err) {
        console.error('fieldServices.loadInsightsFromFieldData - SoilGrids API error:', err);
        // Continue with default values if API fails
    }
    const prompt = `
      You are an agricultural AI assistant. Based on the following field and soil data, provide actionable insights to help a farmer optimize their field conditions:

      - Crop: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.fieldCrop) || 'Unknown'}
      - Soil Type: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.soilType) || 'Unknown'}
      - Field Size: ${(fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.fieldSizeInAcres) || 'Unknown'} acres
      - Temperature: ${(((_f = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _f === void 0 ? void 0 : _f.temperature) || 0)}°C
      - Humidity: ${(((_g = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _g === void 0 ? void 0 : _g.humidity) || 0)}%
      - Soil Moisture: ${(((_h = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _h === void 0 ? void 0 : _h.soilMoisture) || 0)}%
      - Light Intensity: ${(((_j = fieldInfo === null || fieldInfo === void 0 ? void 0 : fieldInfo.sensorData) === null || _j === void 0 ? void 0 : _j.lightIntensity) || 0)} lux
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
    const result = yield model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1600, // ~400 words (assuming 4 tokens/word)
        },
    });
    // const responseText = "no res";
    const responseText = result.response.text();
    if (!responseText) {
        throw new AppError_1.default(http_status_1.default.INTERNAL_SERVER_ERROR, "Failed to generate insights from Gemini API!");
    }
    // console.log('fieldServices.loadInsightsFromFieldData - Gemini response:', responseText);
    return responseText;
});
exports.fieldServices = {
    addField,
    removeField,
    updateField,
    readAllFields,
    readFieldById,
    readMyFieldsFromDB,
    loadInsightsFromFieldData,
    loadLongInsightsFromFieldData
};
