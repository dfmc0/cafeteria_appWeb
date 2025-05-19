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

  getOrders(): Observable<Order[]> {
  return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  // return this.http.get<Order[]>(`http://localhost:5000/orders`);

}
  changeStatus(orderId: number, status: OrderStatusString): Observable<any> {
    return this.http.put(`${this.baseUrl}/${orderId}/status`, { status });
  }
}
