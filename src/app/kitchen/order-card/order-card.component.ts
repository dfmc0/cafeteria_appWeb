import { ChangeDetectorRef, Component, EventEmitter, Input, Output, OnInit, OnDestroy, SimpleChanges } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { StatusLabelMap, OrderStatusString } from '../interfaces/order-status';
import { MenuItemService } from '../services/menu-item.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModifierService } from '../services/modifier.service';
import { TeacherService } from '../services/teacher.service';
import { Teacher } from '../interfaces/teacher';
import { OrderLine } from '../interfaces/order-line';
import { catchError, forkJoin, of } from 'rxjs';
import { MenuCacheService } from '../services/menu-cache.service';
import { TeacherCacheService } from '../services/teacher-cache.service';

const STORAGE_KEY = 'ordenesOcultas';

@Component({
  standalone: false,
  selector: 'app-order-card',
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.css']
})
export class OrderCardComponent implements OnInit, OnDestroy {

  @Input() order!: Order & { statusChangedAt?: Date | null };
  @Output() statusChange = new EventEmitter<Order>();
  @Output() hideOrder = new EventEmitter<number>();

  isUpdating = false;
  isLoading = true;
  statusLabels = StatusLabelMap;
  mostrarModal = false;
  mensajeCambio = '';
  mostrarMensaje = false;
  hideAfterMinutes = 1;
  imageUrlsByMenuItemId: { [menuItemId: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [modifierId: number]: SafeUrl | null } = {};
  shouldShow = true;
  mensajeTimeout: ReturnType<typeof setTimeout> | undefined;
  private refreshIntervalId: ReturnType<typeof setInterval> | undefined;
  ocultadaLocalmente = false;
  private readonly defaultImagePath = 'assets/images/Loading_icon.gif';
  private fetchedMenuItemIds = new Set<number>();
  private fetchedModifierIds = new Set<number>();
  private fetchedTeacherIds = new Set<number>();
  private static menuItemCache: { [id: number]: any } = {};
  private static modifierCache: { [id: number]: any } = {};

  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private teacherService: TeacherService,
    private sanitizer: DomSanitizer,
    private menuCache: MenuCacheService,
    private teacherCache: TeacherCacheService,
    private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.resetFetchedCaches();
    this.fetchMissingData();
    this.preloadImages();
    this.ocultadaLocalmente = this.estaOcultadaLocalmente();

    this.refreshIntervalId = setInterval(() => {
      const shouldBeShown = this.shouldShowOrder();
      const isLocallyHidden = this.ocultadaLocalmente;
      const isInLocalStorage = this.getOrdenesOcultas().includes(this.order.id);

      if (!shouldBeShown || (isLocallyHidden && isInLocalStorage)) {
        this.hideOrder.emit(this.order.id);
      } else if (isLocallyHidden && !isInLocalStorage) {
        this.ocultadaLocalmente = false;
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && this.order) {
      this.resetFetchedCaches();
      this.fetchMissingData();
      this.preloadImages();
    }
  }

  /** Unifica la carga de teacher, menuItems y modifiers faltantes */
  private fetchMissingData(): void {
    this.isLoading = true;
    const menuItemIds = new Set<number>();
    const modifierIds = new Set<number>();
    const observables = [];

    // Teacher
    if (this.order.teacherId && !this.order.teacher) {
      const teacher$ = this.teacherService.getTeacherById(this.order.teacherId).pipe(
        catchError(() => of(null))
      );
      observables.push(teacher$);
    }

    // OrderLines
    this.order.orderLines.forEach(line => {
      if (line.menuItemId && (!line.menuItem || !line.menuItem.name)) {
        menuItemIds.add(line.menuItemId);
      }
      line.lineModifiers?.forEach(mod => {
        if (mod.modifierId != null && (!mod.modifier || !mod.modifier.name)) {
          modifierIds.add(mod.modifierId);
        }
      });
    });

    const menuItems$ = menuItemIds.size > 0
      ? forkJoin(Array.from(menuItemIds).map(id =>
          this.menuItemService.getMenuItemById(id).pipe(catchError(() => of(null)))
        ))
      : of([]);

    const modifiers$ = modifierIds.size > 0
      ? forkJoin(Array.from(modifierIds).map(id =>
          this.modifierService.getModifierById(id).pipe(catchError(() => of(null)))
        ))
      : of([]);

    forkJoin([menuItems$, modifiers$, ...(observables as any)]).subscribe((results: any[]) => {
      const menuItems = results[0] || [];
      const modifiers = results[1] || [];
      const teacher = results.length > 2 ? results[2] : null;

      if (teacher) {
        this.order.teacher = teacher;
        this.teacherCache.teachers[teacher.id] = teacher;
      }

      // GUARDA EN CACHE
      (menuItems as any[]).forEach(item => {
        if (item) this.menuCache.menuItems[item.id] = item;
      });
      this.order.orderLines.forEach(line => {
        if (line.menuItemId && (!line.menuItem || !line.menuItem.name)) {
          const found = (menuItems as any[]).find(item => item && item.id === line.menuItemId);
          if (found) line.menuItem = found;
        }
      });

      (modifiers as any[]).forEach(mod => {
        if (mod) this.menuCache.modifiers[mod.id] = mod;
      });
      this.order.orderLines.forEach(line => {
        line.lineModifiers?.forEach(mod => {
          if (mod.modifierId != null && (!mod.modifier || !mod.modifier.name)) {
            const found = (modifiers as any[]).find(m => m && m.id === mod.modifierId);
            if (found) mod.modifier = found;
          }
        });
      });

      this.isLoading = false;
      this.cdr.detectChanges();
    });
  }
  preloadImages(): void {
    if (!this.order || !this.order.orderLines) return;

    this.order.orderLines.forEach(line => {
      const menuItemId = line.menuItemId;
      if (menuItemId && !this.imageUrlsByMenuItemId[menuItemId]) {
        this.menuItemService.getMenuItemImage(menuItemId).subscribe({
          next: (blob: Blob) => {
            const objectURL = URL.createObjectURL(blob);
            this.imageUrlsByMenuItemId[menuItemId] = this.sanitizer.bypassSecurityTrustUrl(objectURL);
            this.cdr.detectChanges();
          },
          error: () => {
            this.imageUrlsByMenuItemId[menuItemId] = this.defaultImagePath;
            this.cdr.detectChanges();
          }
        });
      }
      line.lineModifiers?.forEach(modifier => {
        const modifierId = modifier.modifierId;
        if (modifierId && !this.modifierImageUrlsById[modifierId]) {
          this.modifierService.getModifierImage(modifierId).subscribe({
            next: (blob: Blob) => {
              const objectURL = URL.createObjectURL(blob);
              this.modifierImageUrlsById[modifierId] = this.sanitizer.bypassSecurityTrustUrl(objectURL);
              this.cdr.detectChanges();
            },
            error: () => {
              this.modifierImageUrlsById[modifierId] = this.defaultImagePath;
              this.cdr.detectChanges();
            }
          });
        }
      });
    });
  }

  private resetFetchedCaches(): void {
    this.fetchedMenuItemIds.clear();
    this.fetchedModifierIds.clear();
    this.fetchedTeacherIds.clear();
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
  
  getMenuItemName(line: OrderLine): string {
    return line.menuItem?.name || this.menuCache.menuItems[line.menuItemId]?.name || 'Cargando...';
  }
  getModifierName(mod: any): string {
    return mod.modifier?.name || this.menuCache.modifiers[mod.modifierId]?.name || 'Modificador';
  }
  getTeacherName(): string {
    return this.order.teacher?.name || this.teacherCache.teachers[this.order.teacherId]?.name || 'Cargando...';
  }
  getTeacherSurnames(): string {
    return this.order.teacher?.surnames || this.teacherCache.teachers[this.order.teacherId]?.surnames || '';
  }
 async cambiarEstadoA(nuevoEstado: OrderStatusString): Promise<void> {
  this.isUpdating = true;
  this.cerrarModalEstado();
  this.mensajeCambio = 'Actualizando estado...';
  this.mostrarMensaje = true;
  this.cdr.detectChanges();

  this.orderService.changeStatus(this.order.id, nuevoEstado).subscribe({
    next: async (updatedOrder) => {
      this.order.status = updatedOrder.status;
      this.order.statusChangedAt = updatedOrder.statusChangedAt || new Date();

      if (updatedOrder.teacherId) {
          this.order.teacher =
            this.teacherCache.teachers[updatedOrder.teacherId] ||
            this.order.teacher ||
            undefined;
        }
      if (updatedOrder.orderLines) {
        // NO reemplaces el array, solo actualiza los objetos existentes
        updatedOrder.orderLines.forEach((updatedLine: OrderLine) => {
          const currentLine = this.order.orderLines.find(l => l.id === updatedLine.id);
          if (currentLine) {
            currentLine.quantity = updatedLine.quantity;

            // Producto: nunca pierdas el objeto ya cargado
            if (updatedLine.menuItemId) {
              currentLine.menuItem =
                currentLine.menuItem ||
                this.menuCache.menuItems[updatedLine.menuItemId] ||
                { id: updatedLine.menuItemId };
            }

            // Modificadores: NO reemplaces el array, solo actualiza los objetos
            if (updatedLine.lineModifiers && currentLine.lineModifiers) {
              updatedLine.lineModifiers.forEach(updatedMod => {
                const currentMod = currentLine.lineModifiers?.find(m => m.id === updatedMod.id);
                if (currentMod && updatedMod.modifierId) {
                  currentMod.modifier = currentMod.modifier ||
                    this.menuCache.modifiers[updatedMod.modifierId] ||
                    { id: updatedMod.modifierId };
                }
              });
              
            }
          }
        });
      }

      // NO reemplaces los arrays, solo actualiza los objetos
      this.isUpdating = false;
      this.cdr.detectChanges();
      this.statusChange.emit(this.order);
      this.mensajeCambio = 'Estado actualizado correctamente';
      this.setMensajeOcultoConDelay(3000);
    },
    error: (err) => {
      this.isUpdating = false;
      console.error('Error actualizando estado:', err);
      this.mensajeCambio = 'Error actualizando estado';
      this.cdr.detectChanges();
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
    if (!order.orderDate) return '';
    const date = new Date(order.orderDate as string);
    return `Hora: ${date.getHours()} y ${date.getMinutes()}`;
  }

  shouldShowOrder(): boolean {
    if (this.order.status === 'FINALIZADO' || this.order.status === 'CANCELADO') {
      if (!this.order.statusChangedAt) return true;
      const ahora = new Date();
      const diffMinutos = (ahora.getTime() - new Date(this.order.statusChangedAt).getTime()) / 60000;
      return diffMinutos < this.hideAfterMinutes;
    }
    return true;
  }

  estaOcultadaLocalmente(): boolean {
    return this.getOrdenesOcultas().includes(this.order.id);
  }

  getOrdenesOcultas(): number[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  setOrdenesOcultas(ids: number[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }

  confirmarOcultarOrden(): void {
    if (confirm('¿Estás seguro de que quieres ocultar esta orden?')) {
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

  // Imágenes
  getImagesFromOrder(menuItem: { id: number, name: string }): SafeUrl[] {
    const images: SafeUrl[] = [];
    const id = menuItem.id;
    const name = menuItem.name?.toLowerCase() || '';
    const baseImage = this.imageUrlsByMenuItemId[id];
    images.push(baseImage || this.getStaticImage());
    if (['poleo', 'manzanilla'].some(t => name.includes(t))) {
      images.push(this.getStaticImage('te.png'));
    }
    if (name.includes('café con leche') || name.includes('cortado')) {
      images.push(this.getStaticImage('leche.png'));
    }
    return images;
  }

  getStaticImage(filename?: string): SafeUrl {
    const file = filename || this.defaultImagePath.split('/').pop();
    return this.sanitizer.bypassSecurityTrustUrl(`assets/images/${file}`);
  }

  getModifierImage(modifierId: number): SafeUrl | null {
    return this.modifierImageUrlsById[modifierId] || null;
  }

  getModifierImages(modifierId: number, name: string): SafeUrl[] {
    const image = this.getModifierImage(modifierId);
    const images: SafeUrl[] = [];
    if (image) images.push(image);
    const lower = name.toLowerCase();
    return images.length > 0 ? images : [this.getStaticImage()];
  }
}
