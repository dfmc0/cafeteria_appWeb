import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { Order } from '../interfaces/order';
import { environment } from '../../environments/environment';
import { OrderStatusString } from '../interfaces/order-status';



@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`).pipe(
      map(ordersRaw =>
        ordersRaw.map(order => ({
          ...order,
          orderLines: order.orderLines.map(line => ({
            ...line,
          }))
        }))
      )
    );
  }

  changeStatus(orderId: number, status: OrderStatusString): Observable<any> {
    const payload = { status };
    const url = `${this.baseUrl}/orders/${orderId}`;

    return this.http.patch(url, payload);
  }
}
