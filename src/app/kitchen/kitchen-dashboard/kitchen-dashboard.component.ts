import { Component, OnInit, isDevMode } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { MenuItem } from '../interfaces/menu-item';
import { Modifier } from '../interfaces/modifier';
import { MenuItemService } from '../services/menu-item.service';
import { ModifierService } from '../services/modifier.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { timer, Subscription } from 'rxjs';

// ... todos los imports sin cambios ...
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
      this.showHelpButton = false;
    }
  }

  showHelp: boolean = false;
  showHelpButton: boolean = false;
  orders: Order[] = [];

  bebidas: MenuItem[] = [];
  bocadillos: MenuItem[] = [];

  bebidaModifiers: Modifier[] = [];
  bocadilloModifiers: Modifier[] = [];

  imageUrlsByMenuItemId: { [id: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [id: number]: SafeUrl | null } = {};

  private readonly defaultImagePath = 'assets/images/Loading_icon.gif';
  private lastOrderId = 0;
  private lastOrderHash = '';
  private refreshSub?: Subscription;

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
    this.loadModifiers(); // solo precarga imágenes

    this.refreshSub = timer(0, 5000).subscribe(() => {
      this.checkForNewOrders();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadOrders(): void {
    this.orderService.getOrders().subscribe((data: Order[]) => {
      this.syncOrders(data);
      this.lastOrderId = data.length > 0 ? Math.max(...data.map(o => o.id)) : 0;
      this.lastOrderHash = this.generateOrderHash(data);
    });
  }

  loadMenuItems(): void {
    this.menuItemService.getMenuItems().subscribe((items: MenuItem[]) => {
      this.bebidas = items.filter(i => i.category === 'DRINK');
      this.bocadillos = items.filter(i => i.category === 'FOOD');

      this.bebidaModifiers = this.extractUniqueModifiers(this.bebidas);
      this.bocadilloModifiers = this.extractUniqueModifiers(this.bocadillos);
      

      this.preloadMenuImages();
    });
  }

  private extractUniqueModifiers(items: MenuItem[]): Modifier[] {
    const seen = new Set<number>();
    const modifiers: Modifier[] = [];

    items.forEach(item => {
      item.allowedModifiers?.forEach(mod => {
        if (!seen.has(mod.id)) {
          seen.add(mod.id);
          modifiers.push(mod);
        }
      });
    });

    return modifiers;
  }

  loadModifiers(): void {
    this.modifierService.getModifiers().subscribe((mods: Modifier[]) => {

      this.preloadMenuImages();
    });
  }

  onStatusChange(updatedOrder: Order): void {
    const order = this.orders.find(o => o.id === updatedOrder.id);
    if (order) {
      Object.assign(order, updatedOrder);
      // Si necesitas reordenar visualmente, haz solo un sort IN PLACE:
      this.orders.sort((a, b) => {
        const orderPriority = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
        const estadoDiff = orderPriority.indexOf(a.status) - orderPriority.indexOf(b.status);
        if (estadoDiff !== 0) return estadoDiff;

        const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
        const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
        return dateB - dateA;
      });
    }
  }

  sortOrdersByStatus(orders: Order[]): Order[] {
    const orderPriority = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
    return orders.slice().sort((a, b) => {
      const estadoDiff = orderPriority.indexOf(a.status) - orderPriority.indexOf(b.status);
      if (estadoDiff !== 0) return estadoDiff;

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

    return images;
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
      imgElement.onerror = null;
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

  private generateOrderHash(orders: Order[]): string {
    return orders.map(o => `${o.id}-${o.status}-${o.orderDate}`).join('|');
  }

  checkForNewOrders(): void {
    this.orderService.getOrders().subscribe((data: Order[]) => {
      const newHash = this.generateOrderHash(data);
      if (newHash !== this.lastOrderHash) {
        this.orders = this.sortOrdersByStatus(data);
        this.lastOrderId = data.length > 0 ? Math.max(...data.map(o => o.id)) : 0;
        this.lastOrderHash = newHash;
      }
    });
  }
  private syncOrders(newOrders: Order[]): void {
  // Actualiza existentes y añade nuevos
  newOrders.forEach(newOrder => {
    const existing = this.orders.find(o => o.id === newOrder.id);
    if (existing) {
      Object.assign(existing, newOrder);
    } else {
      this.orders.push(newOrder);
    }
  });
  // Elimina los que ya no existen
  this.orders = this.orders.filter(o => newOrders.some(n => n.id === o.id));
  // Ordena in place
  this.orders.sort((a, b) => {
    const orderPriority = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
    const estadoDiff = orderPriority.indexOf(a.status) - orderPriority.indexOf(b.status);
    if (estadoDiff !== 0) return estadoDiff;
    const dateA = a.orderDate ? new Date(a.orderDate).getTime() : 0;
    const dateB = b.orderDate ? new Date(b.orderDate).getTime() : 0;
    return dateB - dateA;
  });
}
}
