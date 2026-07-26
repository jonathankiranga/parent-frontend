function formatCurrency(value) {
  return `KSh ${Number(value || 0).toLocaleString()}`;
}

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
  const lines = doc.splitTextToSize(text || '', maxWidth);
  doc.text(lines, x, y);
  return y + (lines.length * lineHeight);
}

export async function downloadAcademicPdf(report, childName, phone, term) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const student = report?.student || {};
  const areas = report?.areas || [];
  const attendance = report?.attendance || {};
  const settings = report?.report_settings || {};
  const layout = settings?.layout_json || {};
  const layoutSections = Array.isArray(layout.sections) ? layout.sections : ['attendance', 'learning_areas'];
  const styles = layout.styles || {};
  const titleFontSize = styles.titleFontSize || 18;
  const sectionFontSize = styles.sectionFontSize || 11;
  const bodyFontSize = styles.bodyFontSize || 10;
  const reportTitle = layout.report_title || 'Education APP - Academic Report';
  const logo = layout.logo || {};

  let y = 18;

  if (logo.url) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = logo.url;
      });
      const imgWidth = logo.width || 50;
      const imgHeight = logo.height || 50;
      const align = logo.align || 'left';
      let x = 14;
      if (align === 'center') x = (doc.internal.pageSize.width - imgWidth) / 2;
      else if (align === 'right') x = doc.internal.pageSize.width - imgWidth - 14;
      doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);
      y += imgHeight + 6;
    } catch (e) {
      // Logo failed to load, skip
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(titleFontSize);
  doc.text(reportTitle, 14, y);
  y += titleFontSize > 14 ? 10 : 8;
  doc.setFontSize(bodyFontSize);
  doc.setFont('helvetica', 'normal');
  doc.text(`Parent: ${phone}`, 14, y);
  y += 6;
  doc.text(`Child: ${childName || student.full_name || 'Unknown'}`, 14, y);
  y += 6;
  doc.text(`Class: ${student.class_name || 'N/A'}`, 14, y);
  y += 6;
  doc.text(`Term: ${term}`, 14, y);
  y += 12;

  if (settings.show_teacher_name && settings.teacher_name) {
    doc.setFont('helvetica', 'bold');
    doc.text('Class Teacher', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(settings.teacher_name, 18, y);
    y += 8;
  }

  if (layoutSections.includes('attendance')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionFontSize);
    doc.text('Attendance Summary', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(bodyFontSize);
    doc.text(`Total attendance logs: ${attendance.total || 0}`, 14, y);
    y += 6;
    doc.text(`Present count: ${attendance.present || 0}`, 14, y);
    y += 12;
  }

  if (layoutSections.includes('learning_areas')) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(sectionFontSize);
    doc.text('Learning Areas', 14, y);
    y += 8;

    if (areas.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.text('No assessment data available for this term.', 14, y);
    } else {
      areas.forEach((area) => {
        if (y > 260) {
          doc.addPage();
          y = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(bodyFontSize);
        doc.text(`${area.area_name}`, 14, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Average: ${area.avg_pct || 0}%`, 18, y);
        y += 6;
        y = addWrappedText(doc, `Summary: ${area.strand_summary || 'No strand summary available'}`, 18, y, 170, 5);
        y += 4;
      });
    }
  }

  if (settings.show_teacher_signature && settings.teacher_signature) {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Teacher Signature', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(settings.teacher_signature, 18, y);
    y += 10;
  }

  if (settings.show_final_remarks && settings.final_remarks) {
    if (y > 235) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Final Remarks', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, settings.final_remarks, 18, y, 170, 5);
    y += 6;
  }

  if (settings.show_recommendation && settings.recommendation_text) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.text('Recommendation', 14, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, settings.recommendation_text, 18, y, 170, 5);
    y += 6;
  }

  doc.save(`${(childName || 'child').replace(/\s+/g, '-')}-academic-report-${term}.pdf`);
}

export async function downloadFeePdf(statement, childName, phone, term, year) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const items = statement?.items || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Education APP - Fee Statement', 14, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Parent: ${phone}`, 14, 26);
  doc.text(`Child: ${childName}`, 14, 32);
  doc.text(`Term: ${term} / Year: ${year}`, 14, 38);

  let y = 52;
  doc.setFont('helvetica', 'bold');
  doc.text('Fee Breakdown', 14, y);
  y += 8;

  if (items.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.text('No fee items found for this statement.', 14, y);
  } else {
    items.forEach((item) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.text(`${item.fee_name}`, 14, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Amount: ${formatCurrency(item.effective_amount || item.amount)}`, 18, y);
      y += 5;
      doc.text(`Paid: ${formatCurrency(item.paid || 0)}`, 18, y);
      y += 5;
      doc.text(`Balance: ${formatCurrency(item.balance || 0)}`, 18, y);
      y += 8;
    });
  }

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Due: ${formatCurrency(statement?.total_due || 0)}`, 14, y);
  y += 6;
  doc.text(`Total Paid: ${formatCurrency(statement?.total_paid || 0)}`, 14, y);
  y += 6;
  doc.text(`Outstanding Balance: ${formatCurrency(statement?.balance || 0)}`, 14, y);

  doc.save(`${(childName || 'child').replace(/\s+/g, '-')}-fee-statement-${term}.pdf`);
}
