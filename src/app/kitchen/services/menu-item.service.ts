import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuItem } from '../interfaces/menu-item';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  //Para recibir todos los elementos del menú
  getMenuItems(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.baseUrl}/menu_items`);
  }
  //Para recibir la imagen de un elemento del menú por su ID
  getMenuItemImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/item/${id}`, { responseType: 'blob' });
  }
}