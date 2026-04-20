import * as XLSX from "xlsx";

const workbookPath = "C:/Users/User/Downloads/Proposed Loading - Tri Term.xlsx";
const workbook = XLSX.readFile(workbookPath);

for (const sheetName of workbook.SheetNames) {
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Array<string | number | null>>(worksheet, {
    blankrows: false,
    defval: null,
    header: 1
  });

  console.log(`\nSHEET: ${sheetName}`);
  console.log(JSON.stringify(rows.slice(0, 25), null, 2));
}
