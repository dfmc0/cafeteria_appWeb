import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Modifier } from '../interfaces/modifier';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ModifierService {
  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}
    // Sirve para obtener la lista de modificadores
  getModifiers(): Observable<Modifier[]> {
    return this.http.get<Modifier[]>(`${this.baseUrl}/modifiers`);
  }
  // Obtener la imagen de un elemento de los modificadores por ID
  getModifierImage(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/image/modifier/${id}`, { responseType: 'blob' });
  }
}