import { Component, OnInit, SimpleChanges } from '@angular/core';
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
  
  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  //metodo para inicializar el componente y cargar los pedidos, items del menu y modificadores

  //metodo para cargar servicios de pedidos y ordenar por estado 
  loadOrders(): void {
    this.orderService.getOrders().subscribe((data: Order[]) => {
      this.orders = this.ordenarPorEstado(data);
    });
  }

  //metodo para cargar los items del menu y los modificadores para mostralos
    loadMenuItems(): void {
    this.menuItemService.getMenuItems().subscribe((items: MenuItem[]) => {
      this.bebidas = items.filter(i => i.category === 'DRINK');
      this.bocadillos = items.filter(i => i.category === 'FOOD');
      this.preloadMenuImages(); // ✅ Aquí sí ya puedes cargar imágenes
    });
  }

  //metodo para cargar los modificadores de su respectivo bocadillo o bebida
    loadModifiers(): void {
    this.modifierService.getModifiers().subscribe((mods: Modifier[]) => {
      this.bebidaModifiers = mods.slice(0, 4);
      this.bocadilloModifiers = mods.slice(4);
      this.preloadMenuImages(); // ✅ Aquí también
    });
  }
  //metodo para cambiar la pestaña seleccionada
  onStatusChange(updatedOrder: Order): void {
    const index = this.orders.findIndex(o => o.id === updatedOrder.id);
    if (index !== -1) {
      this.orders[index] = updatedOrder;
      this.orders = this.ordenarPorEstado(this.orders);
    }
  }

  //metodo para ordenar los pedidos por estado segun el enumerado de estados   
  ordenarPorEstado(orders: Order[]): Order[] {
    const orden = ['RECIBIDO', 'EN_PREPARACION', 'FINALIZADO', 'CANCELADO'];
    return orders.slice().sort((a, b) =>
      orden.indexOf(a.status) - orden.indexOf(b.status)
    );
  }
  //metodo para obtener la ruta de la imagen de un item del menu, se cambiara en le despligue
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
      // Precargar imágenes de todos los platos
      this.bebidas.forEach(item => {
        if (item.id && !this.imageUrlsByMenuItemId[item.id]) {
          this.loadImageByType(item.id, 'menuItem');
        }
      });

      this.bocadillos.forEach(item => {
        if (item.id && !this.imageUrlsByMenuItemId[item.id]) {
          this.loadImageByType(item.id,  'menuItem');
        }
      });

      // Precargar imágenes de modificadores
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

      private loadImageByType(
        id: number,
        type: 'menuItem' | 'modifier'
      ): void {
        // Determinar caché correspondiente
        const cache =
          type === 'menuItem' ? this.imageUrlsByMenuItemId : this.modifierImageUrlsById;

        if (cache[id]) return; // Ya está cargada

        const fetch$ =
          type === 'menuItem'
            ? this.menuItemService.getMenuItemImage(id)
            : this.modifierService.getModifierImage(id);

        if (!fetch$ || typeof (fetch$ as any).subscribe !== 'function') {
          // No es un observable, no hacemos nada
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
            console.error(`Error cargando imagen para ${type} ${id}:`, err);
            cache[id] = null;
            this.cdr.detectChanges();
          }
        });
      }
      getImages(menuItem: MenuItem): SafeUrl[] {
        const baseImage = this.imageUrlsByMenuItemId[menuItem.id] || null;
        const images: SafeUrl[] = [];

        if (baseImage) {
          images.push(baseImage);
        }

        const name = menuItem.name.toLowerCase();

        if (['poleo', 'manzanilla',].some(t => name.includes(t))) {
          const teImage = this.getStaticImage('te.png');
          if (teImage) images.push(teImage);
        }

        if (name.includes('café con leche') || name.includes('cortado')) {
          const lecheImage = this.getStaticImage('leche.png');
          if (lecheImage) images.push(lecheImage);
        }

        return images;
      }
    
    private getStaticImage(filename: string): SafeUrl | null {
      try {
        const url = `assets/images/${filename}`;
        return this.sanitizer.bypassSecurityTrustUrl(url);
      } catch {
        return null;
      }
    }
    getModifierImage(modifierId: number): SafeUrl | null {
      return this.modifierImageUrlsById[modifierId] || null;
    }
  // getImagePath(filename: string): string {
  //   return `assets/images/${filename}`;
  // }

  //metodo para la reproducir texto a voz en español
  speak(text: string): void {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    speechSynthesis.speak(utterance);
  }
  //metodo para refrescar los pedidos, se llamara al hacer click en el boton de refrescar
  refrescarPedidos(): void {
    this.loadOrders();
  }
}
