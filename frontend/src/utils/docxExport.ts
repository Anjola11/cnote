import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
  BorderStyle,
  Footer,
  PageNumber,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import { format } from 'date-fns';
import type { Form, FormResponseItem } from '../types/forms';

export interface DocxExportOptions {
  orientation: 'portrait' | 'landscape';
  margins: 'normal' | 'compact';
  includeTitle: boolean;
  includeMeta: boolean;
  includeIndex: boolean;
  includeTimestamp: boolean;
  includeResponseId: boolean;
  selectedFieldIds: string[];
}

export function formatCellValue(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '—';
  }
  return String(val);
}

/**
 * Generates an authentic Microsoft Word (.docx) document containing a native table
 * with responses, configured page orientation (Portrait or Landscape), repeating
 * headers across pages, professional styling, and page numbering.
 */
export async function generateResponsesDocx(
  form: Form,
  responses: FormResponseItem[],
  options: DocxExportOptions
): Promise<Blob> {
  const isLandscape = options.orientation === 'landscape';

  // Standard A4 dimensions in DXA: width: 11906, height: 16838
  // Note: docx's internal createPageSize automatically swaps width and height
  // when orientation === PageOrientation.LANDSCAPE. Supplying already-swapped dimensions
  // results in double-swapping back to portrait. We therefore pass standard A4 dimensions.
  const pageWidth = 11906;
  const pageHeight = 16838;

  // Margin sizes in DXA:
  // Normal = 1 inch (1440 DXA); Compact = 0.5 inch (720 DXA)
  const marginSize = options.margins === 'compact' ? 720 : 1440;

  // Filter and order fields
  const activeFields = [...form.fields]
    .sort((a, b) => a.order - b.order)
    .filter(f => options.selectedFieldIds.includes(f.id));

  // Determine table columns
  interface TableCol {
    key: string;
    label: string;
    widthPercent?: number;
    getValue: (res: FormResponseItem, index: number) => string;
  }

  const columns: TableCol[] = [];

  if (options.includeIndex) {
    columns.push({
      key: 'index',
      label: '#',
      widthPercent: 6,
      getValue: (_res, index) => String(index + 1),
    });
  }

  if (options.includeResponseId) {
    columns.push({
      key: 'id',
      label: 'ID',
      widthPercent: 10,
      getValue: (res) => res.id.slice(0, 8),
    });
  }

  if (options.includeTimestamp) {
    columns.push({
      key: 'submitted_at',
      label: 'Submitted At',
      widthPercent: 14,
      getValue: (res) => {
        try {
          return format(new Date(res.submitted_at), 'yyyy-MM-dd HH:mm');
        } catch {
          return res.submitted_at || '—';
        }
      },
    });
  }

  activeFields.forEach(field => {
    columns.push({
      key: field.id,
      label: field.label || 'Untitled Field',
      getValue: (res) => {
        const answer = res.answers.find(a => a.field_id === field.id);
        return formatCellValue(answer?.value);
      },
    });
  });

  // Calculate cell widths proportionally
  const fixedCols = columns.filter(c => c.widthPercent !== undefined);
  const fixedTotal = fixedCols.reduce((sum, c) => sum + (c.widthPercent || 0), 0);
  const remainingCols = columns.filter(c => c.widthPercent === undefined);
  const remainingPctEach = remainingCols.length > 0 ? Math.floor((100 - fixedTotal) / remainingCols.length) : 0;

  columns.forEach(col => {
    if (col.widthPercent === undefined) {
      col.widthPercent = remainingPctEach;
    }
  });

  // Border style for cells
  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: 'CBD5E1', // slate-300
  };

  const bordersConfig = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
  };

  const cellMargins = {
    top: 100, // in DXA (~5pt)
    bottom: 100,
    left: 140, // in DXA (~7pt)
    right: 140,
  };

  // Header row
  const headerRow = new TableRow({
    tableHeader: true, // Native Word feature: repeats header row on every new page!
    cantSplit: true,
    children: columns.map(col => new TableCell({
      width: { size: col.widthPercent || 10, type: WidthType.PERCENTAGE },
      shading: { fill: 'F1F5F9' }, // Light slate header background
      margins: cellMargins,
      borders: bordersConfig,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: col.label,
              bold: true,
              size: 18, // 9pt (half-points)
              font: 'Segoe UI',
              color: '0F172A', // slate-900
            }),
          ],
        }),
      ],
    })),
  });

  // Data rows
  const dataRows = responses.map((res, index) => {
    const isEven = index % 2 === 1;
    return new TableRow({
      cantSplit: true, // Prevents row from being split across page boundaries
      children: columns.map(col => new TableCell({
        width: { size: col.widthPercent || 10, type: WidthType.PERCENTAGE },
        shading: isEven ? { fill: 'F8FAFC' } : undefined, // subtle zebra stripe
        margins: cellMargins,
        borders: bordersConfig,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: col.getValue(res, index),
                size: 17, // 8.5pt
                font: 'Segoe UI',
                color: '334155', // slate-700
              }),
            ],
          }),
        ],
      })),
    });
  });

  // Native Word Table instance
  const responsesTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: [headerRow, ...dataRows],
  });

  // Section children (Title, metadata, table)
  const sectionChildren: any[] = [];

  if (options.includeTitle) {
    sectionChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({
            text: form.title || 'Form Responses',
            bold: true,
            size: 32, // 16pt
            font: 'Segoe UI',
            color: '0F172A',
          }),
        ],
        spacing: { after: 120 },
      })
    );

    if (form.description) {
      sectionChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: form.description,
              size: 20, // 10pt
              font: 'Segoe UI',
              color: '64748B',
              italics: true,
            }),
          ],
          spacing: { after: 140 },
        })
      );
    }
  }

  if (options.includeMeta) {
    sectionChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Exported on: ${format(new Date(), 'PPP p')}   |   Total Responses: ${responses.length}   |   Columns: ${columns.length}`,
            size: 18, // 9pt
            font: 'Segoe UI',
            color: '64748B',
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  sectionChildren.push(responsesTable);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
              width: pageWidth,
              height: pageHeight,
            },
            margin: {
              top: marginSize,
              right: marginSize,
              bottom: marginSize,
              left: marginSize,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Page ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Segoe UI',
                  }),
                ],
              }),
            ],
          }),
        },
        children: sectionChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}
