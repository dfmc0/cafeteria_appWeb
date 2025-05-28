import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order } from '../interfaces/order';
import { environment } from '../../environments/environment';
import { OrderStatusString } from '../interfaces/order-status';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  //Servicio para obtener todas las órdenes
  getOrders(): Observable<Order[]> {
  return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  // return this.http.get<Order[]>(`http://localhost:5000/orders`);
  }

  //Servicio para obtener cambiar el estado de una orden por su ID y el estado deseado
  //TENER EN CUENTA QUE SI LA ORDEN NO TIENE Y ALGUNOS ELEMENTOS QUE NO PUEDEN SER NULL, ESTO NO FUNCIONA
  changeStatus(orderId: number, status: OrderStatusString): Observable<any> {
    const payload = { status };
    const url = `${this.baseUrl}/orders/${orderId}`;

    return this.http.patch(url, payload);
  }
}
