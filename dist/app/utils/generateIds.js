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
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFieldId = exports.generateFarmerId = void 0;
const fields_model_1 = require("../modules/appData/fields/fields.model");
const user_model_1 = require("../modules/appData/user/user.model");
const generateFarmerId = () => __awaiter(void 0, void 0, void 0, function* () {
    const allUsersDataLength = (yield user_model_1.UserModel.find()).length + 1;
    return `fr${allUsersDataLength}`;
});
exports.generateFarmerId = generateFarmerId;
const generateFieldId = () => __awaiter(void 0, void 0, void 0, function* () {
    const allFieldsDataLength = (yield fields_model_1.FieldModel.find()).length + 1;
    return `fd${allFieldsDataLength}`;
});
exports.generateFieldId = generateFieldId;
