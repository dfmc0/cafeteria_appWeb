import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
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
    isUpdating = false;
    statusLabels = StatusLabelMap;
    mostrarModal = false;
    mensajeCambio = '';
    mostrarMensaje = false;
    private cambioDesdeBoton = false;

    constructor(private orderService: OrderService, private cdr: ChangeDetectorRef) {} 

    //metodo para abrir la sección de cambio de estado
    abrirModalEstado(): void {
        this.mostrarModal = true;
    }
    //metodo para cerrar la sección de cambio de estado
    cerrarModalEstado(): void {
        this.mostrarModal = false;
    }

    //metodo para mostrar mensaje de cambio de estado
    mostrarMensajeCambio(texto: string): boolean {
      if (!this.cambioDesdeBoton) {
          return false;
      }
      
      this.mensajeCambio = texto;
      this.mostrarMensaje = true;
      
      // Usar detectChanges para asegurar que el mensaje se actualiza
      this.cdr.detectChanges();
      
      setTimeout(() => {
          this.mostrarMensaje = false;
          this.cambioDesdeBoton = false;
          this.cdr.detectChanges();
      }, 3000);
      
      return true;
  }
    //metodo para actualizar el estado del pedido utilizando el servicio correspondiente
    updateOrderStatus(orderId: number, status: OrderStatusString): void {
        this.orderService.changeStatus(orderId, status).subscribe({
            next: (updatedOrder) => {
                console.log('Estado actualizado:', updatedOrder);
                this.statusChange.emit(updatedOrder);
                this.cerrarModalEstado();
                this.isUpdating = false;
                
                const statusKey = updatedOrder.status as OrderStatusString;
                this.mostrarMensajeCambio(`Cambio realizado: Pedido #${updatedOrder.id} ahora está ${this.statusLabels[statusKey]}`);
            },
            error: (err) => {
                console.error('Error al actualizar el estado', err);
                this.isUpdating = false;
                this.mostrarMensajeCambio(`Error al cambiar el estado del pedido`);
            }
        });
    }

    //metodo para obtener la clase de estilo del estado del pedido
    getStatusClass(status: OrderStatusString): string {
        switch (status) {
            case 'CANCELADO': return 'status-border status-cancelado';
            case 'RECIBIDO': return 'status-border status-recibido';
            case 'EN_PREPARACION': return 'status-border status-preparacion';
            case 'FINALIZADO': return 'status-border status-finalizado';
            default: return 'status-border';
        }
    }
    //metodo para obtener la clase de estilo del boton del estado del pedido
    getStatusButtonClass(status: OrderStatusString): string {
        switch (status) {
            case 'CANCELADO': return 'estado-opcion-btn status-cancelado';
            case 'RECIBIDO': return 'estado-opcion-btn status-recibido';
            case 'EN_PREPARACION': return 'estado-opcion-btn status-preparacion';
            case 'FINALIZADO': return 'estado-opcion-btn status-finalizado';
            default: return 'estado-opcion-btn';
        }
    }
    //metodo para obtener los estados disponibles para cambiar el estado del pedido
    getAvailableStatuses(): OrderStatusString[] {
        const allStatuses: OrderStatusString[] = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
        return allStatuses.filter(s => s !== this.order.status);
    }
    //metodo para obtener la ruta de la imagen del item del menu
    getImagePathP(filename: string): string {
        filename.toLowerCase();
        filename.replace(/\s+/g, '_');
        filename.concat('.png');
        return `assets/images/${filename}`;
    }
    //metodo para obtener la ruta de la imagen del item del menu, se normaliza el nombre del archivo
    getImagePath(filename: string): string { 
    return `assets/images/${
        filename
            .toLowerCase()           
            .normalize('NFD')        
            .replace(/[\u0300-\u036f]/g, '') 
            .replace(/\s+/g, '_')    
            .concat('.png')          
    }`;
}
    //metodo para reproducir texto a voz en español
    speak(text: string): void {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'es-ES';
        speechSynthesis.speak(utterance);
    }
    //metodo para cambiar el estado del pedido al hacer click en el boton correspondiente
    cambiarEstadoA(nuevoEstado: OrderStatusString): void {
        this.cambioDesdeBoton = true;
        this.isUpdating = true;
        
        const mensajePrevia = `Cambio realizado: Pedido #${this.order.id}`;
        console.log('Mensaje preparado:', mensajePrevia);
        
        this.updateOrderStatus(this.order.id, nuevoEstado);
    }
}