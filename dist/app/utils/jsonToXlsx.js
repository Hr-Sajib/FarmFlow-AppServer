"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonMultiToXlsxBuffer = void 0;
const xlsx_1 = __importDefault(require("xlsx"));
const jsonMultiToXlsxBuffer = (sheets) => {
    const workbook = xlsx_1.default.utils.book_new();
    sheets.forEach(({ data, sheetName, headers }) => {
        if (!data || data.length === 0) {
            console.warn(`⚠️ Skipping empty sheet: ${sheetName}`);
            return;
        }
        let worksheet;
        if (headers) {
            // Create header row
            const headerRow = [headers];
            // Convert filtered data to array of arrays based on header order
            const dataRows = data.map(row => headers.map(header => { var _a; return (_a = row[header]) !== null && _a !== void 0 ? _a : ""; }));
            worksheet = xlsx_1.default.utils.aoa_to_sheet([...headerRow, ...dataRows]);
        }
        else {
            worksheet = xlsx_1.default.utils.json_to_sheet(data);
        }
        xlsx_1.default.utils.book_append_sheet(workbook, worksheet, sheetName);
    });
    return xlsx_1.default.write(workbook, { type: "buffer", bookType: "xlsx" });
};
exports.jsonMultiToXlsxBuffer = jsonMultiToXlsxBuffer;
