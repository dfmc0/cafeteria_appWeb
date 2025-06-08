import { Component, OnInit, isDevMode } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { MenuItem } from '../interfaces/menu-item';
import { Modifier } from '../interfaces/modifier';
import { MenuItemService } from '../services/menu-item.service';
import { ModifierService } from '../services/modifier.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  standalone: false,
  selector: 'app-kitchen-dashboard',
  templateUrl: './kitchen-dashboard.component.html',
  styleUrls: ['./kitchen-dashboard.component.css']
})
export class KitchenDashboardComponent implements OnInit {
  private _selectedTab: 'orders' | 'dishes' = 'orders';

  get selectedTab(): 'orders' | 'dishes' {
    this.showHelpButton = true; 
    return this._selectedTab;
  }

  set selectedTab(value: 'orders' | 'dishes') {
    if (this._selectedTab !== value) {
      this._selectedTab = value;
      this.showHelpButton = false; // Oculta ayuda al cambiar de pestaña
    }
  }

  showHelp: boolean = false;
  showHelpButton: boolean = false;
  orders: Order[] = [];

  bebidas: MenuItem[] = [];
  bocadillos: MenuItem[] = [];

  bebidaModifiers: Modifier[] = [];
  bocadilloModifiers: Modifier[] = [];

  // Cache para imágenes por menuItemId y modifierId
  imageUrlsByMenuItemId: { [id: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [id: number]: SafeUrl | null } = {};

  private readonly defaultImagePath = 'assets/images/Loading_icon.gif';

  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {
    this.loadOrders();
    this.loadMenuItems();
    this.loadModifiers();
  }

  // loadOrders(): void {
  //   this.orderService.getOrders().subscribe((data: Order[]) => {
  //     this.orders = this.sortOrdersByStatus(data);
  //   });
  // }DEMOSTRACION
  loadOrders(): void {
  this.orderService.getOrders().subscribe((data: Order[]) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // "YYYY-MM-DD"
    
    // Filtrar órdenes cuya fecha coincide con la fecha actual
    const filteredOrders = data.filter(order => {
      const orderDateStr = order.orderDate?.split('T')[0]; // ajustar según propiedad y formato
      return orderDateStr === todayStr;
    });

    this.orders = this.sortOrdersByStatus(filteredOrders);
  });
}

  loadMenuItems(): void {
    this.menuItemService.getMenuItems().subscribe((items: MenuItem[]) => {
      this.bebidas = items.filter(i => i.category === 'DRINK');
      this.bocadillos = items.filter(i => i.category === 'FOOD');
      this.preloadMenuImages();
    });
  }

  loadModifiers(): void {
    this.modifierService.getModifiers().subscribe((mods: Modifier[]) => {
      this.bebidaModifiers = mods.slice(0, 4);
      this.bocadilloModifiers = mods.slice(4);
      this.preloadMenuImages();
    });
  }

  onStatusChange(updatedOrder: Order): void {
    const index = this.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      this.orders[index] = updatedOrder;
      this.orders = this.sortOrdersByStatus(this.orders);
    }
  }

  sortOrdersByStatus(orders: Order[]): Order[] {
    const orderPriority = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
    return orders.slice().sort((a, b) => {
    const estadoDiff = orderPriority.indexOf(a.status) - orderPriority.indexOf(b.status);

      if (estadoDiff !== 0) {
        return estadoDiff;
      }

      // Si tienen el mismo estado, ordenar por fecha (FIFO: más antiguo primero)
      const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
      const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  private preloadMenuImages(): void {
    [...this.bebidas, ...this.bocadillos].forEach(item => {
      if (item.id && !this.imageUrlsByMenuItemId[item.id]) {
        this.loadImage(item.id, 'menuItem');
      }
    });

    [...this.bebidaModifiers, ...this.bocadilloModifiers].forEach(mod => {
      if (mod.id && !this.modifierImageUrlsById[mod.id]) {
        this.loadImage(mod.id, 'modifier');
      }
    });
  }

  private loadImage(id: number, type: 'menuItem' | 'modifier'): void {
    const cache = type === 'menuItem' ? this.imageUrlsByMenuItemId : this.modifierImageUrlsById;

    if (cache[id]) return;

    const fetch$ = type === 'menuItem'
      ? this.menuItemService.getMenuItemImage(id)
      : this.modifierService.getModifierImage(id);

    if (!fetch$ || typeof fetch$.subscribe !== 'function') return;

    fetch$.subscribe({
      next: (blob: Blob) => {
        const objectURL = URL.createObjectURL(blob);
        const safeUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
        cache[id] = safeUrl;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (isDevMode()) {
          console.warn(`Error loading ${type} image id ${id}:`, err);
        }
        cache[id] = this.getStaticImage();
        this.cdr.detectChanges();
      }
    });
  }

  getImages(menuItem: MenuItem): SafeUrl[] {
    const baseImage = this.imageUrlsByMenuItemId[menuItem.id] || this.getStaticImage();
    const images: SafeUrl[] = [baseImage];

    const name = menuItem.name.toLowerCase();

    if (['poleo', 'manzanilla'].some(t => name.includes(t))) {
      const teImage = this.getStaticImage('te.png');
      if (teImage) images.push(teImage);
    }

    if (name.includes('café con leche') || name.includes('cortado')) {
      const lecheImage = this.getStaticImage('leche.png');
      if (lecheImage) images.push(lecheImage);
    }

    return images.length > 0 ? images : [this.getStaticImage()!];
  }

  private getStaticImage(filename?: string): SafeUrl {
    const file = filename || this.defaultImagePath.split('/').pop()!;
    return this.sanitizer.bypassSecurityTrustUrl(`assets/images/${file}`);
  }

  getModifierImage(modifierId: number): SafeUrl | null {
    return this.modifierImageUrlsById[modifierId] || null;
  }

  speak(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    speechSynthesis.speak(utterance);
  }

  refrescarPedidos(): void {
    this.loadOrders();
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    if (imgElement.src !== this.defaultImagePath) {
      imgElement.src = this.defaultImagePath;
    } else {
      imgElement.onerror = null; // prevenir loop infinito
    }
  }

  trackByOrderId(index: number, order: Order): number {
    return order.id;
  }
   toggleHelp() {
    this.showHelp = !this.showHelp;
  }
  handleHideOrder(orderId: number) {
    this.orders = this.orders.filter(order => order.id !== orderId);
  }
}
  