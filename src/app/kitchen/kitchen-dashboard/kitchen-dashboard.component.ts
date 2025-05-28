import { Component, OnInit } from '@angular/core';
import { Order } from '../interfaces/order';
import { OrderService } from '../services/order.service';
import { MenuItem } from '../interfaces/menu-item';
import { Modifier } from '../interfaces/modifier';
import { MenuItemService } from '../services/menu-item.service';
import { ModifierService } from '../services/modifier.service';

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

  constructor(
    private orderService: OrderService,
    private menuItemService: MenuItemService,
    private modifierService: ModifierService
  ) {}

  //metodo para inicializar el componente y cargar los pedidos, items del menu y modificadores
  ngOnInit(): void {
    this.loadOrders();
    this.loadMenuItems();
    this.loadModifiers();
  }

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
    });
  }

  //metodo para cargar los modificadores de su respectivo bocadillo o bebida
  loadModifiers(): void {
    this.modifierService.getModifiers().subscribe((mods: Modifier[]) => {
      // Asumiendo que separamos los primeros 4 para bebidas, resto para bocadillos
      this.bebidaModifiers = mods.slice(0, 4);
      this.bocadilloModifiers = mods.slice(4);
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
  getImagePath(filename: string): string {
    return `assets/images/${filename}`;
  }
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
