import XLSX from "xlsx";
export const jsonMultiToXlsxBuffer = (
  sheets: {
    data: Record<string, any>[];
    sheetName: string;
    headers?: string[];
  }[]
): Buffer => {
  const workbook = XLSX.utils.book_new();

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
      const dataRows = data.map(row =>
        headers.map(header => row[header] ?? "")
      );
      worksheet = XLSX.utils.aoa_to_sheet([...headerRow, ...dataRows]);
    } else {
      worksheet = XLSX.utils.json_to_sheet(data);
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};