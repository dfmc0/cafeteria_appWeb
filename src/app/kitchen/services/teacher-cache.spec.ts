import { TestBed } from '@angular/core/testing';

import { TeacherCacheService } from './teacher-cache.service';

describe('TeacherCacheServiceService', () => {
  let service: TeacherCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TeacherCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
