import { ChangeDetectorRef, Component, EventEmitter, Input, Output, NgZone, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { StatusLabelMap, OrderStatusString } from '../interfaces/order-status';
import { MenuItemService } from '../services/menu-item.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModifierService } from '../services/modifier.service';

@Component({
  standalone: false,
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.css']
})
export class OrderCardComponent implements OnChanges, OnInit {
  @Input() order!: Order;
  @Output() statusChange = new EventEmitter<Order>();

  isUpdating = false;
  statusLabels = StatusLabelMap;
  mostrarModal = false;
  mensajeCambio = '';
  mostrarMensaje = false;
  private cambioDesdeBoton = false;

  // Cache para imágenes por menuItemId
  imageUrlsByMenuItemId: { [menuItemId: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [modifierId: number]: SafeUrl | null } = {};

  mensajeTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.preloadImages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order']) {
      this.preloadImages();
    }
  }

  private preloadImages(): void {
    if (!this.order?.orderLines) return;

    this.order.orderLines.forEach(line => {
      if (line.menu_item_id != null) {
        this.loadImageByType(line.menu_item_id, line.menu_item_id, 'menuItem');
      }

      line.lineModifiers?.forEach(mod => {
        const id = mod.modifier?.id;
        const imageUrl = mod.modifier?.imageUrl;
        if (id && imageUrl) {
          this.loadImageByType(id, imageUrl, 'modifier');
        }
      });
    });
  }

  private loadImageByType(
    id: number,
    imageUrlOrId: string | number,
    type: 'menuItem' | 'modifier'
  ): void {
    const cache =
      type === 'menuItem' ? this.imageUrlsByMenuItemId : this.modifierImageUrlsById;

    if (cache[id]) return;

    const fetch$ =
      type === 'menuItem'
        ? this.menuItemService.getMenuItemImage(imageUrlOrId as number)
        : this.modifierService.getModifierImage(id);

    if (!fetch$ || typeof (fetch$ as any).subscribe !== 'function') {
      return;
    }

    (fetch$ as import('rxjs').Observable<Blob>).subscribe({
      next: (blob: Blob) => {
        const objectURL = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        cache[id] = safeUrl;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(Error);
        cache[id] = null;
        this.cdr.detectChanges();
      }
    });
  }

  getImage(menuItemId: number): SafeUrl | null {
    return this.imageUrlsByMenuItemId[menuItemId] || null;
  }

  getModifierImage(modifierId: number): SafeUrl | null {
    return this.modifierImageUrlsById[modifierId] || null;
  }

  abrirModalEstado(): void {
    this.mostrarModal = true;
  }

  cerrarModalEstado(): void {
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  abrirMensaje(): void {
    this.mostrarMensaje = true;
  }

  cerrarMensaje(): void {
    this.mostrarMensaje = false;
  }
  
  async manejarEstadoAsync(estado: OrderStatusString): Promise<void> {
    await this.mostrarMensajeCambio();
    await this.cambiarEstadoA(estado);
}

  mostrarMensajeCambio(): Promise<void> {
      return new Promise(resolve => {
          this.mensajeCambio = 'Estado actualizado correctamente';
          this.mostrarMensaje = true;
          this.cdr.detectChanges();
          
          setTimeout(() => {
              this.ocultarMensajeConAnimacion();
              resolve();
          }, 5000);
      });
  }
  ocultarMensajeConAnimacion(): void {
        const elemento = document.querySelector('.mensaje-cambio');
        if (elemento instanceof HTMLElement) {
            elemento.classList.add('salir');
            setTimeout(() => {
                this.mostrarMensaje = false;
                this.cdr.detectChanges();
                elemento.classList.remove('salir');
            }, 300);
        }
    }

  // Ahora solo llama a cambiarEstadoA sin mostrar mensaje
  handleStatusChangeClick(nuevoEstado: OrderStatusString): void {
    this.cambiarEstadoA(nuevoEstado);
  }

  updateOrderStatus(orderId: number, status: OrderStatusString): void {
    this.isUpdating = true;
    this.orderService.changeStatus(orderId, status).subscribe({
        next: (updatedOrder) => {
            this.order.status = updatedOrder.status;
            this.statusChange.emit(updatedOrder);
            this.cerrarModalEstado();
            this.mostrarMensajeCambio(); // Ahora mostrará el mensaje por más tiempo
            this.isUpdating = false;
        },
        error: (err) => {
            console.error('Error al cambiar estado:', err);
            this.isUpdating = false;
          }
      });
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

  speak(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    speechSynthesis.speak(utterance);
  }

  cambiarEstadoA(nuevoEstado: OrderStatusString): void {
    this.cambioDesdeBoton = true;
    this.isUpdating = true;
    this.updateOrderStatus(this.order.id, nuevoEstado);
  }
}

