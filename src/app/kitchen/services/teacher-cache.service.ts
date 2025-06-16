import { Injectable } from '@angular/core';
import { Teacher } from '../interfaces/teacher';

@Injectable({ providedIn: 'root' })
export class TeacherCacheService {
  teachers: { [id: number]: Teacher } = {};
}