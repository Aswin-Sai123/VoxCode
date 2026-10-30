import readXlsxFile from 'read-excel-file/browser';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;

/**
 * Extracts candidate emails from an uploaded Excel (.xlsx, .xls) or CSV file.
 * Prioritizes columns named "email", "mail", "candidate email", etc.,
 * and falls back to scanning all cells across the spreadsheet for valid emails.
 *
 * @param {File} file
 * @returns {Promise<{ emails: string[], fileName: string, totalFound: number }>}
 */
export async function extractEmailsFromSpreadsheet(file) {
    if (!file) return { emails: [], fileName: '', totalFound: 0 };

    const fileName = file.name || 'spreadsheet';
    const lowerName = fileName.toLowerCase();
    const extractedSet = new Set();

    if (lowerName.endsWith('.csv') || lowerName.endsWith('.txt')) {
        const text = await file.text();
        const matches = text.match(EMAIL_REGEX) || [];
        matches.forEach(m => extractedSet.add(m.trim().toLowerCase()));
    } else {
        try {
            const rows = await readXlsxFile(file);
            if (rows && rows.length > 0) {
                // 1. Check header row for email/mail column indicators
                const headerRow = rows[0] || [];
                const emailColIndexes = [];
                headerRow.forEach((cell, idx) => {
                    const str = String(cell || '').toLowerCase().trim();
                    if (/email|e-mail|mail|candidate.*mail|student.*mail|applicant.*mail/i.test(str)) {
                        emailColIndexes.push(idx);
                    }
                });

                if (emailColIndexes.length > 0) {
                    // Extract specifically from matched email column(s)
                    for (let r = 1; r < rows.length; r++) {
                        const row = rows[r];
                        if (!row) continue;
                        emailColIndexes.forEach(colIdx => {
                            const val = String(row[colIdx] || '').trim();
                            const matches = val.match(EMAIL_REGEX);
                            if (matches) {
                                matches.forEach(m => extractedSet.add(m.trim().toLowerCase()));
                            }
                        });
                    }
                }

                // 2. If nothing found in header-matched columns, scan all cells
                if (extractedSet.size === 0) {
                    for (let r = 0; r < rows.length; r++) {
                        const row = rows[r];
                        if (!row) continue;
                        for (let c = 0; c < row.length; c++) {
                            const val = String(row[c] || '').trim();
                            const matches = val.match(EMAIL_REGEX);
                            if (matches) {
                                matches.forEach(m => extractedSet.add(m.trim().toLowerCase()));
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('readXlsxFile parsing warning, trying text fallback:', err);
            const text = await file.text();
            const matches = text.match(EMAIL_REGEX) || [];
            matches.forEach(m => extractedSet.add(m.trim().toLowerCase()));
        }
    }

    const emails = Array.from(extractedSet);
    return {
        emails,
        fileName,
        totalFound: emails.length
    };
}
