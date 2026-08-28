function formatCurrency(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
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

function drawSummativeTable(doc, summative, x, y, maxW, pageH, levelLabel) {
  const sessions = [];
  const sessionKeys = new Set();
  const subAreas = [];
  const byCell = {};
  summative.forEach((s) => {
    if (!subAreas.includes(s.sub_area_name || '-')) subAreas.push(s.sub_area_name || '-');
  });
  summative.forEach((s) => {
    const key = `${s.exam_type}|${s.exam_name || ''}`;
    if (!sessionKeys.has(key)) { sessionKeys.add(key); sessions.push({ key, label: s.exam_type }); }
    byCell[`${s.sub_area_name || '-'}|${key}`] = s;
  });

  const colSub = 46;
  const n = sessions.length;
  const colAssess = (maxW - colSub) / Math.max(1, n);
  const rowH = 13;

  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, maxW, 7, 'F');
  cell(doc, 'Sub-area', x, y, colSub, 7, { bold: true, size: 7.5 });
  sessions.forEach((se, i) => {
    cell(doc, se.label, x + colSub + i * colAssess, y, colAssess, 7, { bold: true, size: 7.5 });
  });
  y += 7;

  subAreas.forEach((sa) => {
    if (y + rowH > pageH - 30) { doc.addPage(); y = 16; doc.setFillColor(230, 230, 230); doc.rect(x, y, maxW, 7, 'F'); cell(doc, 'Sub-area', x, y, colSub, 7, { bold: true, size: 7.5 }); sessions.forEach((se, i) => cell(doc, se.label, x + colSub + i * colAssess, y, colAssess, 7, { bold: true, size: 7.5 })); y += 7; }
    cell(doc, sa, x, y, colSub, rowH, { size: 7.5 });
    sessions.forEach((se, i) => {
      const s = byCell[`${sa}|${se.key}`];
      const cx = x + colSub + i * colAssess;
      cell(doc, s ? s.summative_score || '-' : '-', cx, y, colAssess, s && s.performance_level ? 6 : rowH, { size: 7 });
      if (s && s.performance_level) {
        cell(doc, levelLabel(s.performance_level), cx, y + 6, colAssess, 7, { size: 6.5 });
      }
    });
    y += rowH;
  });
  return y + 2;
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

  // ---------- Learning areas (standard KNEC CBC strand-level report) ----------
  doc.setDrawColor(60, 60, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('LEARNING AREAS PERFORMANCE', M, y);
  y += 3;

  const colStrand = 40, colSub = 40, colMark = 22, colLevel = W - colStrand - colSub - colMark;

  const rowHeader = (ry) => {
    doc.setFillColor(230, 230, 230);
    doc.rect(M, ry, W, 7, 'F');
    cell(doc, 'Strand', M, ry, colStrand, 7, { bold: true, size: 7.5 });
    cell(doc, 'Sub-strand', M + colStrand, ry, colSub, 7, { bold: true, size: 7.5 });
    cell(doc, 'Mark', M + colStrand + colSub, ry, colMark, 7, { bold: true, size: 7.5 });
    cell(doc, 'Competency Level', M + colStrand + colSub + colMark, ry, colLevel, 7, { bold: true, size: 7.5 });
  };

  const levelLabel = (lvl) => {
    const map = { EE: 'E.E. - Exceeding Expectations', ME: 'M.E. - Meeting Expectations', AE: 'A.E. - Approaching Expectations', BE: 'B.E. - Below Expectations' };
    return (lvl && map[lvl]) ? `${lvl} - ${map[lvl]}` : '-';
  };

  // Empty state
  const hasData = areas.some(a => (a.strands && a.strands.length) || (a.summative && a.summative.length));
  if (!hasData) {
    cell(doc, 'No assessment data recorded for this term yet.', M, y, W, 8, { size: 8 });
    y += 8;
  }

  areas.forEach((a) => {
    const strands = a.strands || [];
    const summative = a.summative || [];
    if (!strands.length && !summative.length) {
      // Learning area with no scores yet — still show as a blank row for completeness
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(String(a.area_name || '').toUpperCase(), M, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      y += 7;
    }

    // Area title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(String(a.area_name || '').toUpperCase(), M, y + 5);
    y += 7;
    if (y > pageH - 40) { doc.addPage(); y = 16; }

    if (strands.length && strands.some(s => s.sub_strands && s.sub_strands.length)) {
      rowHeader(y);
      let ry = y + 7;
      strands.forEach((s, si) => {
        (s.sub_strands || []).forEach((sb) => {
          if (ry + 7 > pageH - 30) { doc.addPage(); ry = 16; rowHeader(ry); ry += 7; }
          cell(doc, si === 0 ? s.strand_name || '' : '', M, ry, colStrand, 7, { size: 7.5 });
          if (si !== 0) cell(doc, '', M, ry, colStrand, 7, { size: 7.5 });
          cell(doc, sb.sub_strand_name || '', M + colStrand, ry, colSub, 7, { size: 7.5 });
          cell(doc, sb.formative_score || '-', M + colStrand + colSub, ry, colMark, 7, { size: 7.5 });
          cell(doc, levelLabel(sb.performance_level), M + colStrand + colSub + colMark, ry, colLevel, 7, { size: 7 });
          ry += 7;
        });
      });

      // Summative (CAT / End-Term) section for this area
      if (summative.length) {
        if (ry + 8 > pageH - 30) { doc.addPage(); ry = 16; }
        cell(doc, 'Summative (CAT / End-Term)', M, ry, W, 6, { bold: true, size: 7.5 });
        ry += 6;
        ry = drawSummativeTable(doc, summative, M, ry, W, pageH, levelLabel);
      }
      y = ry + 5;
    } else if (summative.length) {
      // Only CAT/End-Term data available
      if (y + 8 > pageH - 30) { doc.addPage(); y = 16; }
      cell(doc, 'Summative (CAT / End-Term)', M, y, W, 6, { bold: true, size: 7.5 });
      y += 6;
      y = drawSummativeTable(doc, summative, M, y, W, pageH, levelLabel);
      y += 5;
    }

    if (y > pageH - 40) { doc.addPage(); y = 16; }
  });

  // ---------- Key ----------
  if (y > pageH - 70) { doc.addPage(); y = 18; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('KEY:', M, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text('KEY:  E.E. = Exceeding Expectations    M.E. = Meeting Expectations    A.E. = Approaching Expectations    B.E. = Below Expectations', M, y + 4);
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
