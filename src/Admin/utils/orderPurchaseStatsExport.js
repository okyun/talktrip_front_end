import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const pad2 = (n) => String(n).padStart(2, '0');

/** Blob을 브라우저 다운로드로 즉시 넘깁니다. */
export const triggerBrowserDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const formatRangeLabel = (startMs, endMs) => {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return '';
  const s = new Date(startMs);
  const e = new Date(endMs);
  return `${s.toLocaleString()} ~ ${e.toLocaleString()}`;
};

export const formatEventTime = (value) => {
  if (value == null || value === '') return '-';
  const ms = typeof value === 'number' ? value : Date.parse(value);
  if (!Number.isFinite(ms)) return '-';
  return new Date(ms).toLocaleString();
};

export const buildExportFileStem = (startMs, endMs, prefix = '구매통계') => {
  const s = new Date(startMs);
  const e = new Date(endMs);
  const date = `${s.getFullYear()}-${pad2(s.getMonth() + 1)}-${pad2(s.getDate())}`;
  const span = `${pad2(s.getHours())}${pad2(s.getMinutes())}-${pad2(e.getHours())}${pad2(e.getMinutes())}`;
  return `${prefix}_Top3_${date}_${span}`;
};

export const buildExportRows = (sortedData, productNameById) => {
  return (sortedData || []).map((item, idx) => ({
    순위: `#${idx + 1}`,
    '상품 ID': item?.productId ?? '',
    상품명: productNameById?.[item.productId] ?? '-',
    '구매 수': Number(item?.purchaseCount || 0),
    구매시간: formatEventTime(item?.createdAt),
  }));
};

export const buildProductClickExportRows = (sortedData, productNameById) => {
  return (sortedData || []).map((item, idx) => ({
    순위: `#${idx + 1}`,
    '상품 ID': item?.productId ?? '',
    상품명: productNameById?.[item.productId] ?? '-',
    '클릭 수': Number(item?.clickCount || 0),
    '클릭 시간': formatEventTime(item?.clickedAt),
  }));
};

const exportTablePdf = async (tableElement, meta, prefix) => {
  if (!tableElement) return false;

  const canvas = await html2canvas(tableElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;

  const imgWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const maxHeight = pageHeight - margin * 2;
  const drawHeight = Math.min(imgHeight, maxHeight);
  const drawWidth = (canvas.width * drawHeight) / canvas.height;

  pdf.addImage(imgData, 'PNG', margin, margin, drawWidth, drawHeight);

  const stem = buildExportFileStem(meta.startTimeMs, meta.endTimeMs, prefix);
  pdf.save(`${stem}.pdf`);
  return true;
};

const exportRowsExcel = (rows, meta, prefix, sheetName) => {
  if (!rows?.length) return false;

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const stem = buildExportFileStem(meta.startTimeMs, meta.endTimeMs, prefix);
  triggerBrowserDownload(blob, `${stem}.xlsx`);
  return true;
};

export const exportOrderPurchaseStatsExcel = (rows, meta) =>
  exportRowsExcel(rows, meta, '구매통계', '구매통계');

export const exportProductClickStatsExcel = (rows, meta) =>
  exportRowsExcel(rows, meta, '클릭통계', '클릭통계');

export const exportOrderPurchaseStatsPdf = async (tableElement, meta) =>
  exportTablePdf(tableElement, meta, '구매통계');

export const exportProductClickStatsPdf = async (tableElement, meta) =>
  exportTablePdf(tableElement, meta, '클릭통계');

export const toDatetimeLocalValue = (ms) => {
  const d = new Date(ms);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export const fromDatetimeLocalValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};
