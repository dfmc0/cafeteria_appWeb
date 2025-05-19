import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Order } from '../interfaces/order';
// import { OrderService } from '../services/order.service'; // 🔒 Comentado para uso local
import { StatusCycle, StatusLabelMap, OrderStatusString } from '../interfaces/order-status';

@Component({
  standalone: false,
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.css']
})
export class OrderCardComponent {
  @Input() order!: Order;
  @Output() statusChange = new EventEmitter<Order>();

  statusLabels = StatusLabelMap;
  mostrarModal = false;

  // constructor(private orderService: OrderService) {} // 🔒 Comentado para uso local
  constructor() {} // ✅ Constructor vacío para que compile

  abrirModalEstado(): void {
    this.mostrarModal = true;
  }

  cerrarModalEstado(): void {
    this.mostrarModal = false;
  }

  cambiarEstadoA(nuevoEstado: OrderStatusString): void {
    // 🔒 Servicio deshabilitado por ahora:
    /*
    this.orderService.changeStatus(this.order.id, nuevoEstado).subscribe(() => {
      this.order.status = nuevoEstado;
      this.statusChanged.emit(this.order);
      this.cerrarModalEstado();
    });
    */


    this.order = { ...this.order, status: nuevoEstado };
    this.statusChange.emit(this.order);
    this.cerrarModalEstado();
  }

  getStatusClass(status: OrderStatusString): string {
  switch (status) {
    case 'CANCELADO': return 'status-border status-cancelado';
    case 'RECIBIDO': return 'status-border status-recibido';
    case 'EN_PREPARACION': return 'status-border status-preparacion';
    case 'FINALIZADO': return 'status-border status-finalizado';
    default: return 'status-border';
  }
  }

  getStatusButtonClass(status: OrderStatusString): string {
  switch (status) {
    case 'CANCELADO': return 'estado-opcion-btn status-cancelado';
    case 'RECIBIDO': return 'estado-opcion-btn status-recibido';
    case 'EN_PREPARACION': return 'estado-opcion-btn status-preparacion';
    case 'FINALIZADO': return 'estado-opcion-btn status-finalizado';
    default: return 'estado-opcion-btn';
    }
  }

  getAvailableStatuses(): OrderStatusString[] {
  const allStatuses: OrderStatusString[] = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
  return allStatuses.filter(s => s !== this.order.status);
}

}
