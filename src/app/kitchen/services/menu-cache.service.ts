import { Injectable } from '@angular/core';
import { MenuItem } from '../interfaces/menu-item';
import { Modifier } from '../interfaces/modifier';

@Injectable({ providedIn: 'root' })
export class MenuCacheService {
  menuItems: { [id: number]: MenuItem } = {};
  modifiers: { [id: number]: Modifier } = {};
}