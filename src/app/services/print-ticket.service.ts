import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class PrintTicketService {

  imprimirTicketPrestamo(data: {
    lector: string;
    bibliotecario: string;
    fechaPrestamo: Date;
    fechaLimite: Date;
    ejemplares: Array<{
      codigo: string;
      titulo: string;
      autor: string;
    }>;
  }): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    let y = 8;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BIBLIOTECA JOSEPH RATZINGER', 40, y, { align: 'center' });
    y += 5;
    
    doc.setFontSize(11);
    doc.text('COMPROBANTE DE PRÉSTAMO', 40, y, { align: 'center' });
    y += 7;

    this.drawLine(doc, y, 'double');
    y += 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LECTOR:', 5, y);
    doc.setFont('helvetica', 'normal');
    const lectorLines = doc.splitTextToSize(data.lector, 50);
    doc.text(lectorLines, 25, y);
    y += 4 * lectorLines.length;

    doc.setFont('helvetica', 'bold');
    doc.text('BIBLIOTECARIO:', 5, y);
    doc.setFont('helvetica', 'normal');
    const bibliotecarioLines = doc.splitTextToSize(data.bibliotecario, 45);
    doc.text(bibliotecarioLines, 32, y);
    y += 4 * bibliotecarioLines.length;

    y += 1;
    this.drawLine(doc, y, 'dashed');
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA PRÉSTAMO:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(data.fechaPrestamo), 38, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA LÍMITE:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(data.fechaLimite), 32, y);
    y += 6;

    this.drawLine(doc, y, 'double');
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('EJEMPLARES PRESTADOS', 40, y, { align: 'center' });
    y += 1;
    
    this.drawLine(doc, y, 'solid');
    y += 4;

    doc.setFontSize(7);
    data.ejemplares.forEach((ejemplar, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}.`, 5, y);
      doc.text(ejemplar.codigo, 10, y);
      y += 3.5;
      
      doc.setFont('helvetica', 'normal');
      const tituloLineas = doc.splitTextToSize(ejemplar.titulo, 68);
      tituloLineas.forEach((linea: string) => {
        doc.text(linea, 8, y);
        y += 3.2;
      });

      doc.setFont('helvetica', 'italic');
      const autorLineas = doc.splitTextToSize(`Autor: ${ejemplar.autor}`, 68);
      autorLineas.forEach((linea: string) => {
        doc.text(linea, 8, y);
        y += 3.2;
      });

      if (index < data.ejemplares.length - 1) {
        y += 1;
        this.drawLine(doc, y, 'dotted');
        y += 3;
      } else {
        y += 2;
      }
    });

    this.drawLine(doc, y, 'double');
    y += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('IMPORTANTE:', 40, y, { align: 'center' });
    y += 3.5;
    
    doc.setFont('helvetica', 'italic');
    doc.text('Recuerda devolver los libros antes', 40, y, { align: 'center' });
    y += 3.5;
    doc.text('de la fecha límite para evitar multas', 40, y, { align: 'center' });
    y += 5;

    this.drawLine(doc, y, 'solid');
    y += 4;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(new Date()), 40, y, { align: 'center' });
    y += 3;
    doc.text('Gracias por usar nuestra biblioteca', 40, y, { align: 'center' });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  imprimirTicketPago(data: {
    cajero: string;
    fechaPago: Date;
    multas: Array<{
      motivo: string;
      monto: number;
      diasRetraso?: number;
      montoPorDia?: number;
    }>;
    totalPagar: number;
    montoRecibido: number;
    cambio: number;
  }): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    let y = 8;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('BIBLIOTECA JOSEPH RATZINGER', 40, y, { align: 'center' });
    y += 5;
    
    doc.setFontSize(11);
    doc.text('RECIBO DE PAGO', 40, y, { align: 'center' });
    y += 4;
    doc.setFontSize(9);
    doc.text('MULTAS', 40, y, { align: 'center' });
    y += 7;

    this.drawLine(doc, y, 'double');
    y += 4;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('CAJERO:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(data.cajero, 24, y);
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('FECHA:', 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(data.fechaPago), 20, y);
    y += 6;

    this.drawLine(doc, y, 'double');
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE MULTAS', 40, y, { align: 'center' });
    y += 1;
    
    this.drawLine(doc, y, 'solid');
    y += 4;

    doc.setFontSize(7);
    data.multas.forEach((multa, index) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${index + 1}. ${multa.motivo}`, 5, y);
      y += 3.5;

      if (multa.diasRetraso && multa.montoPorDia) {
        doc.setFont('helvetica', 'normal');
        doc.text(`   ${multa.diasRetraso} días × $${multa.montoPorDia.toFixed(2)}/día`, 5, y);
        y += 3.5;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`$${multa.monto.toFixed(2)}`, 70, y - 3.5, { align: 'right' });
      doc.setFontSize(7);

      if (index < data.multas.length - 1) {
        y += 1;
        this.drawLine(doc, y, 'dotted');
        y += 3;
      } else {
        y += 2;
      }
    });

    this.drawLine(doc, y, 'solid');
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL A PAGAR:', 5, y);
    doc.text(`$${data.totalPagar.toFixed(2)}`, 70, y, { align: 'right' });
    y += 5;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Monto recibido:', 5, y);
    doc.text(`$${data.montoRecibido.toFixed(2)}`, 70, y, { align: 'right' });
    y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('CAMBIO:', 5, y);
    doc.text(`$${data.cambio.toFixed(2)}`, 70, y, { align: 'right' });
    y += 6;

    this.drawLine(doc, y, 'double');
    y += 5;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('¡GRACIAS POR TU PAGO!', 40, y, { align: 'center' });
    y += 3.5;
    
    doc.setFont('helvetica', 'italic');
    doc.text('Conserva este comprobante', 40, y, { align: 'center' });
    y += 5;

    this.drawLine(doc, y, 'solid');
    y += 4;

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatDateTime(new Date()), 40, y, { align: 'center' });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  }

  private drawLine(doc: jsPDF, y: number, style: 'solid' | 'dashed' | 'dotted' | 'double'): void {
    const startX = 5;
    const endX = 75;

    switch (style) {
      case 'solid':
        doc.setLineWidth(0.3);
        doc.line(startX, y, endX, y);
        break;

      case 'dashed':
        doc.setLineDashPattern([2, 1], 0);
        doc.setLineWidth(0.3);
        doc.line(startX, y, endX, y);
        doc.setLineDashPattern([], 0);
        break;

      case 'dotted':
        doc.setLineDashPattern([0.5, 1], 0);
        doc.setLineWidth(0.2);
        doc.line(startX, y, endX, y);
        doc.setLineDashPattern([], 0);
        break;

      case 'double':
        doc.setLineWidth(0.4);
        doc.line(startX, y, endX, y);
        doc.line(startX, y + 0.8, endX, y + 0.8);
        break;
    }
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}