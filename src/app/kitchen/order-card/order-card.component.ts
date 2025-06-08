import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { StatusLabelMap, OrderStatusString } from '../interfaces/order-status';
import { MenuItemService } from '../services/menu-item.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModifierService } from '../services/modifier.service';
const STORAGE_KEY = 'ordenesOcultas';

@Component({
  standalone: false,
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.css']
})
export class OrderCardComponent implements OnInit, OnDestroy {

  @Input() order!: Order & { statusChangedAt?: Date | null }; // <-- Añadido campo opcional statusChangedAt
  @Output() statusChange = new EventEmitter<Order>();

  isUpdating = false;
  statusLabels = StatusLabelMap;
  mostrarModal = false;
  mensajeCambio = '';
  mostrarMensaje = false;
  private cambioDesdeBoton = false;
  hideAfterMinutes =  1; // Numero de minutos tras los cuales ocultar la orden si está finalizada o cancelada
  imageUrlsByMenuItemId: { [menuItemId: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [modifierId: number]: SafeUrl | null } = {};
  shouldShow = true;
  mensajeTimeout: ReturnType<typeof setTimeout> | undefined;
  private refreshIntervalId: ReturnType<typeof setInterval> | undefined; // Para refrescar cada minuto
  ocultadaLocalmente = false;
  
  private readonly defaultImagePath = 'assets/images/Loading_icon.gif';

  ordenesOriginales: Order[] = [];
  ordenesVisibles: Order[] = [];

  @Output() hideOrder = new EventEmitter<number>();
  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.preloadImages();

    // Al iniciar, revisa si esta orden está en la lista de ocultadas:
    this.ocultadaLocalmente = this.estaOcultadaLocalmente();

    this.refreshIntervalId = setInterval(() => {
      if (!this.shouldShowOrder()) {
        this.hideOrder.emit(this.order.id);
      } else if (this.ocultadaLocalmente) {
        // Si fue ocultada manualmente pero ya fue reactivada, no emitir
        const ocultas = this.getOrdenesOcultas();
        if (!ocultas.includes(this.order.id)) {
          this.ocultadaLocalmente = false;
        } else {
          this.hideOrder.emit(this.order.id);
        }
      }
    }, 10000);
  }
   ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  private preloadImages(): void {
    if (!this.order?.orderLines) return;

    this.order.orderLines.forEach(line => {
      const menuItem = line.menuItem;
      if (menuItem?.id != null) {
        this.loadImageByType(menuItem.id, menuItem.id, 'menuItem');
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
        console.error(err);
        cache[id] = null;
        this.cdr.detectChanges();
      }
    });
  }

  getImagesFromOrder(menuItem: { id: number, name: string }): SafeUrl[] {
    const images: SafeUrl[] = [];
    const id = menuItem.id;
    const name = menuItem.name?.toLowerCase() || '';

    const baseImage = this.imageUrlsByMenuItemId[id];
    if (baseImage) {
      images.push(baseImage);
    } else {
      images.push(this.getStaticImage());
    }

    if (['poleo', 'manzanilla'].some(t => name.includes(t))) {
      images.push(this.getStaticImage('te.png'));
    }

    if (name.includes('café con leche') || name.includes('cortado')) {
      images.push(this.getStaticImage('leche.png'));
    }

    return images;
  }

  getStaticImage(filename?: string): SafeUrl {
    const file = filename || this.defaultImagePath.split('/').pop(); // "Loading_icon.gif"
    const fullPath = `assets/images/${file}`;
    return this.sanitizer.bypassSecurityTrustUrl(fullPath);
  }

  getModifierImage(modifierId: number): SafeUrl | null {
    return this.modifierImageUrlsById[modifierId] || null;
  }

  getModifierImages(modifierId: number, name: string): SafeUrl[] {
    const image = this.getModifierImage(modifierId);
    const images: SafeUrl[] = [];

    if (image) images.push(image);

    const lower = name.toLowerCase();
    if (lower.includes('extra') || lower.includes('queso')) {
      const extraImg = this.getStaticImage('extra.png');
      if (extraImg) images.push(extraImg);
    }

    return images.length > 0 ? images : [this.getStaticImage()!];
  }

  abrirModalEstado(): void {
    this.mostrarModal = true;
  }

  cerrarModalEstado(): void {
    this.mostrarModal = false;
    this.cdr.detectChanges();
  }

  mostrarMensajeCambio(estado: OrderStatusString): Promise<void> {
    this.cambiarEstadoA(estado);
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

  cambiarEstadoA(nuevoEstado: OrderStatusString): void {
    this.cambioDesdeBoton = true;
    this.isUpdating = true;

    this.cerrarModalEstado();

    this.mensajeCambio = '⏳ Actualizando estado...';
    this.mostrarMensaje = true;
    this.cdr.detectChanges();

    this.orderService.changeStatus(this.order.id, nuevoEstado).subscribe({
      next: (updatedOrder) => {
        this.order.status = updatedOrder.status;

        // Actualizamos la fecha de cambio de estado si es FINALIZADO o CANCELADO
        if (updatedOrder.status === 'FINALIZADO' || updatedOrder.status === 'CANCELADO') {
          this.order.statusChangedAt = new Date();
        } else {
          this.order.statusChangedAt = null;
        }

        this.statusChange.emit(updatedOrder);

        this.mensajeCambio = 'Estado actualizado correctamente';
        this.cdr.detectChanges();

        this.setMensajeOcultoConDelay(3000);
      },
      error: (err) => {
        console.error('Error al cambiar estado:', err);

        this.mensajeCambio = 'Error al cambiar estado';
        this.cdr.detectChanges();

        this.setMensajeOcultoConDelay(6000);
      },
      complete: () => {
        this.isUpdating = false;
      }
    });
  }

  private setMensajeOcultoConDelay(ms: number): void {
    clearTimeout(this.mensajeTimeout);

    this.mensajeTimeout = setTimeout(() => {
      this.ocultarMensajeConAnimacion();
    }, ms);
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

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = this.defaultImagePath;
  }

  getOrderDateSpeech(order: Order): string {
    if (!order.orderDate) {
      return '';
    }
    const date = new Date(order.orderDate as string);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Por defecto, devuelve la hora en formato "HH y mm"
    return `Hora: ${hours} y ${minutes}`;
  }

  // Nuevo método para decidir si mostrar o no la orden:
  shouldShowOrder(): boolean {
    if (this.order.status === 'FINALIZADO' || this.order.status === 'CANCELADO') {
      if (!this.order.statusChangedAt) {
        return true;
      }

      const ahora = new Date();
      const diffMs = ahora.getTime() - new Date(this.order.statusChangedAt).getTime();
      const diffMinutos = diffMs / 60000;

      return diffMinutos < this.hideAfterMinutes;
    }
    return true;
  }
  // Método para comprobar si la orden está marcada para ocultar localmente
  estaOcultadaLocalmente(): boolean {
    const ocultas = this.getOrdenesOcultas();
    return ocultas.includes(this.order.id);
  }

  // Recuperar array de IDs del localStorage
  getOrdenesOcultas(): number[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Guardar array actualizado en localStorage
  setOrdenesOcultas(ids: number[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  // Método modificado para ocultar la orden (botón)
  confirmarOcultarOrden(): void {
    const confirmacion = confirm('¿Estás seguro de que quieres ocultar esta orden?');
    if (confirmacion) {
      // Marca localmente la orden como ocultada
      const ocultas = this.getOrdenesOcultas();
      if (!ocultas.includes(this.order.id)) {
        ocultas.push(this.order.id);
        this.setOrdenesOcultas(ocultas);
      }
      this.ocultadaLocalmente = true;
      this.hideOrder.emit(this.order.id);
    }
  }
  mostrarOrdenOcultada(): void {
    const ocultas = this.getOrdenesOcultas();
    const index = ocultas.indexOf(this.order.id);
    if (index !== -1) {
      ocultas.splice(index, 1);
      this.setOrdenesOcultas(ocultas);
    }
    this.ocultadaLocalmente = false;
    this.shouldShow = true;
    this.cdr.detectChanges();
  }
  get mostrarBotonOcultar(): boolean {
    return this.order.status === 'FINALIZADO' || this.order.status === 'CANCELADO';
  }
}
