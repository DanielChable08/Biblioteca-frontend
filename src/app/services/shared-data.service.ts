import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {
  private ejemplaresActualizados = new BehaviorSubject<boolean>(false);
  ejemplaresActualizados$ = this.ejemplaresActualizados.asObservable();

  notificarActualizacionEjemplares(): void {
    this.ejemplaresActualizados.next(true);
  }
}
