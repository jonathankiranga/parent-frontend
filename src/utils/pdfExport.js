function formatCurrency(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
}

// CBC performance band from percentage score (KICD rubric)
function cbcLevel(avgPct) {
  const p = Number(avgPct) || 0;
  if (p >= 76) return { code: 'EE', label: 'Exceeding Expectations', point: '4' };
  if (p >= 51) return { code: 'ME', label: 'Meeting Expectations', point: '3' };
  if (p >= 26) return { code: 'AE', label: 'Approaching Expectations', point: '2' };
  return { code: 'BE', label: 'Below Expectations', point: '1' };
}

function cell(doc, text, x, y, w, h, opts = {}) {
  doc.rect(x, y, w, h);
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.size || 8.5);
  const lines = doc.splitTextToSize(String(text == null ? '' : text), w - 3);
  const lh = opts.lineHeight || 4;
  const maxLines = Math.max(1, Math.floor((h - 1) / lh));
  const ty = y + h / 2 + ((opts.size || 8.5) * 0.35) / Math.max(1, lines.length) - ((Math.min(lines.length, maxLines) - 1) * lh) / 2;
  doc.text(lines.slice(0, maxLines), x + 1.5, ty);
}

export async function downloadAcademicPdf(report, childName, phone, term) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const M = 12;
  const W = pageW - M * 2;

  const student = report?.student || {};
  const areas = report?.areas || [];
  const attendance = report?.attendance || {};
  const settings = report?.report_settings || {};
  const school = report?.school_contact || {};

  // ---------- Letterhead ----------
  let y = 14;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.rect(M, y, W, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(String(school.school_name || 'SCHOOL').toUpperCase(), pageW / 2, y + 8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const letterheadLine = [school.contact_address, school.contact_phone && `Tel: ${school.contact_phone}`, school.contact_email]
    .filter(Boolean).join('  |  ');
  if (letterheadLine) doc.text(letterheadLine, pageW / 2, y + 13.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('ASSESSMENT REPORT', pageW / 2, y + 19.5, { align: 'center' });
  y += 30;

  // ---------- Title strip ----------
  doc.setFillColor(238, 238, 238);
  doc.rect(M, y, W, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`STUDENT REPORT CARD - ${String(term).toUpperCase()} ${report?.year || new Date().getFullYear()}`, pageW / 2, y + 5.6, { align: 'center' });
  y += 12;

  // ---------- Learner particulars ----------
  const particulars = [
    ['Student Name', childName || student.full_name || '-'],
    ['Admission No.', student.student_id || '-'],
    ['Class / Grade', student.class_name || '-'],
    ['Parent Contact', phone || '-'],
    ['Attendance', `${attendance.present || 0} of ${attendance.total || 0} days present`],
    ['Times Assessed', String(areas.length)]
  ];
  const rowH = 7;
  const half = W / 2;
  for (let i = 0; i < particulars.length; i += 2) {
    const [l1, v1] = particulars[i];
    const [l2, v2] = particulars[i + 1] || ['', ''];
    cell(doc, l1, M, y, 30, rowH, { bold: true, size: 8 });
    cell(doc, v1, M + 30, y, half - 34, rowH, { size: 8 });
    cell(doc, l2, M + half, y, 28, rowH, { bold: true, size: 8 });
    cell(doc, v2, M + half + 28, y, half - 28, rowH, { size: 8 });
    y += rowH;
  }
  y += 6;

  // ---------- Performance table ----------
  doc.setDrawColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LEARNING AREAS PERFORMANCE', M, y);
  y += 3;

  const colArea = 74, colScore = 20, colLevel = 44, colRemark = W - colArea - colScore - colLevel;
  const tableHeader = (ry) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(M, ry, W, 7, 'F');
    cell(doc, 'Learning Area', M, ry, colArea, 7, { bold: true, size: 8 });
    cell(doc, 'Score (%)', M + colArea, ry, colScore, 7, { bold: true, size: 8 });
    cell(doc, 'Performance Level', M + colArea + colScore, ry, colLevel, 7, { bold: true, size: 8 });
    cell(doc, 'Assessment Levels Recorded', M + colArea + colScore + colLevel, ry, colRemark, 7, { bold: true, size: 8 });
  };

  tableHeader(y);
  let ry = y + 7;
  areas.forEach((a) => {
    const lvl = cbcLevel(a.avg_pct);
    const remText = String(a.strand_summary || '-');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    const remLines = doc.splitTextToSize(remText, colRemark - 3).slice(0, 3);
    const rowHeight = Math.max(8, remLines.length * 4 + 4);
    if (ry + rowHeight > pageH - 22) {
      doc.addPage();
      ry = 16;
      tableHeader(ry);
      ry += 7;
    }
    cell(doc, a.area_name, M, ry, colArea, rowHeight, { size: 8 });
    cell(doc, `${a.avg_pct != null ? a.avg_pct : '-'}`, M + colArea, ry, colScore, rowHeight, { size: 8 });
    cell(doc, `${lvl.code} (${lvl.point}) - ${lvl.label}`, M + colArea + colScore, ry, colLevel, rowHeight, { size: 7 });
    cell(doc, remLines.join('\n'), M + colArea + colScore + colLevel, ry, colRemark, rowHeight, { size: 7, lineHeight: 4 });
    ry += rowHeight;
  });
  if (areas.length === 0) {
    cell(doc, 'No assessment data recorded for this term yet.', M, ry, W, 8, { size: 8 });
    ry += 8;
  }
  y = ry + 6;

  // ---------- Key ----------
  if (y > pageH - 70) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('KEY:', M, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('BE 0-25 Below Expectations    AE 26-50 Approaching    ME 51-75 Meeting    EE 76-100 Exceeding', M + 10, y + 4);
  y += 10;

  // ---------- Remarks & signatures ----------
  const sigBlock = (title, name, remark) => {
    if (y > pageH - 55) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title, M, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    if (remark) y = addWrappedText(doc, remark, M, y, W, 4);
    doc.setLineWidth(0.3);
    doc.line(M, y + 6, M + 80, y + 6);
    doc.line(pageW - M - 40, y + 6, pageW - M, y + 6);
    doc.setFontSize(7.5);
    doc.text(name ? `Name: ${name}` : 'Signature & Date', M, y + 10);
    doc.text('Signature & Date', pageW - M - 40, y + 10);
    y += 18;
  };

  sigBlock(
    'CLASS TEACHER',
    settings.show_teacher_name ? settings.teacher_name : null,
    settings.show_final_remarks ? settings.final_remarks : null
  );
  sigBlock(
    'HEAD TEACHER',
    null,
    settings.show_recommendation ? settings.recommendation_text : null
  );

  // ---------- Footer on all pages ----------
  for (let i = 1; i <= doc.internal.getNumberOfPages(); i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`Generated by Smarternow Data Venture - ${new Date().toLocaleDateString()}`, pageW / 2, pageH - 6, { align: 'center' });
    doc.setTextColor(0);
  }

  doc.save(`${(childName || 'child').replace(/\s+/g, '-')}-report-card-${term}.pdf`);
}

export async function downloadFeePdf(statement, childName, phone, term, year) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  const items = statement?.items || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('OFFICIAL FEE STATEMENT', pageW / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${childName || ''}   |   Term ${term}, ${year}   |   Contact: ${phone}`, pageW / 2, 24, { align: 'center' });

  let y = 34;
  const colName = 90, colAmt = 32, colPaid = 32, colBal = pageW - 24 - colName - colAmt - colPaid;

  doc.setFillColor(230, 230, 230);
  doc.rect(12, y, pageW - 24, 7, 'F');
  cell(doc, 'Fee Item', 12, y, colName, 7, { bold: true, size: 8 });
  cell(doc, 'Charged', 12 + colName, y, colAmt, 7, { bold: true, size: 8 });
  cell(doc, 'Paid', 12 + colName + colAmt, y, colPaid, 7, { bold: true, size: 8 });
  cell(doc, 'Balance', 12 + colName + colAmt + colPaid, y, colBal, 7, { bold: true, size: 8 });

  y += 7;
  items.forEach((item) => {
    if (y > 260) {
      doc.addPage();
      y = 18;
    }
    cell(doc, item.fee_name, 12, y, colName, 7, { size: 8 });
    cell(doc, formatCurrency(item.effective_amount || item.amount), 12 + colName, y, colAmt, 7, { size: 8 });
    cell(doc, formatCurrency(item.paid || 0), 12 + colName + colAmt, y, colPaid, 7, { size: 8 });
    cell(doc, formatCurrency(item.balance || 0), 12 + colName + colAmt + colPaid, y, colBal, 7, { size: 8 });
    y += 7;
  });
  if (items.length === 0) {
    cell(doc, 'No fee items recorded for this term.', 12, y, pageW - 24, 7, { size: 8 });
    y += 7;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(`Total Charged: ${formatCurrency(items.reduce((s, i) => s + Number(i.effective_amount || i.amount || 0), 0))}`, 14, y);
  y += 6;
  doc.text(`Total Paid: ${formatCurrency(statement?.total_paid || 0)}`, 14, y);
  y += 6;
  doc.setFontSize(11);
  doc.text(`OUTSTANDING BALANCE: ${formatCurrency(statement?.balance || 0)}`, 14, y);

  doc.save(`${(childName || 'child').replace(/\s+/g, '-')}-fee-statement-${term}.pdf`);
}
