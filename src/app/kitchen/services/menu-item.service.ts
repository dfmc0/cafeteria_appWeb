import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MenuItem } from '../interfaces/menu-item';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MenuItemService {
  getModifierImage(arg0: string) {
    throw new Error('Method not implemented.');
  }
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Obtener todos los elementos del menú
  getMenuItems(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.baseUrl}/menu_items`);
  }

  // Obtener la imagen de un elemento del menú por ID
  getMenuItemImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/image/item/${id}`, { responseType: 'blob' });
  }

}