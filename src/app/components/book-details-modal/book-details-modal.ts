import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Libro } from '../../models';

@Component({
  selector: 'app-book-details-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule],
  templateUrl: './book-details-modal.html',
  styleUrls: ['./book-details-modal.css']
})
export class BookDetailsModalComponent {
  @Input() display = false;
  @Input() libro: Libro | null = null;
  @Output() displayChange = new EventEmitter<boolean>();

  closeModal() {
    this.displayChange.emit(false);
  }
}