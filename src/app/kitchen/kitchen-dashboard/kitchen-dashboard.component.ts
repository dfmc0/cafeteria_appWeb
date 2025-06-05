import { Component, OnInit, SimpleChanges, isDevMode } from '@angular/core'
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
  selectedTab = 'orders';
  orders: Order[] = [];

  bebidas: MenuItem[] = [];
  bocadillos: MenuItem[] = [];

  bebidaModifiers: Modifier[] = [];
  bocadilloModifiers: Modifier[] = [];
  // Cache para imágenes por menuItemId
  imageUrlsByMenuItemId: { [menuItemId: number]: SafeUrl | null } = {};
  modifierImageUrlsById: { [modifierId: number]: SafeUrl | null } = {};
  
  private readonly defaultImagePath = 'assets/images/Loading_icon.gif';

  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  loadOrders(): void {
    this.orderService.getOrders().subscribe((data: Order[]) => {
      this.orders = this.ordenarPorEstado(data);
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
      this.orders = this.ordenarPorEstado(this.orders);
    }
  }

  ordenarPorEstado(orders: Order[]): Order[] {
    const orden = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
    return orders.slice().sort((a, b) =>
      orden.indexOf(a.status) - orden.indexOf(b.status)
    );
  }

  ngOnInit(): void {
    this.loadOrders();
    this.loadMenuItems();
    this.loadModifiers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order']) {
      this.preloadMenuImages();
    }
  }

  private preloadMenuImages(): void {
    this.bebidas.forEach(item => {
      if (item.id && !this.imageUrlsByMenuItemId[item.id]) {
        this.loadImageByType(item.id, 'menuItem');
      }
    });

    this.bocadillos.forEach(item => {
      if (item.id && !this.imageUrlsByMenuItemId[item.id]) {
        this.loadImageByType(item.id, 'menuItem');
      }
    });

    this.bebidaModifiers.forEach(mod => {
      if (mod.id && !this.modifierImageUrlsById[mod.id]) {
        this.loadImageByType(mod.id, 'modifier');
      }
    });

    this.bocadilloModifiers.forEach(mod => {
      if (mod.id && !this.modifierImageUrlsById[mod.id]) {
        this.loadImageByType(mod.id, 'modifier');
      }
    });
  }

  private loadImageByType(id: number, type: 'menuItem' | 'modifier'): void {
    const cache =
      type === 'menuItem' ? this.imageUrlsByMenuItemId : this.modifierImageUrlsById;

    if (cache[id]) return;

    const fetch$ =
      type === 'menuItem'
        ? this.menuItemService.getMenuItemImage(id)
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
        if (isDevMode()) {
          console.warn(`Error cargando imagen para ${type} ${id}:`, err);
        }
        // Evitar reintentos infinitos asignando imagen default
        cache[id] = this.getStaticImage();
        this.cdr.detectChanges();
      }
    });
  }

  getImages(menuItem: MenuItem): SafeUrl[] {
    const baseImage = this.imageUrlsByMenuItemId[menuItem.id] || this.getStaticImage();
    const images: SafeUrl[] = [];

    if (baseImage) {
      images.push(baseImage);
    }

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
    const fullPath = `assets/images/${file}`;
    return this.sanitizer.bypassSecurityTrustUrl(fullPath);
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

  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    // Evitar loop infinito de carga de imagen default
    if (imgElement.src !== this.defaultImagePath) {
      imgElement.src = this.defaultImagePath;
    } else {
      imgElement.onerror = null;
    }
  }
}
