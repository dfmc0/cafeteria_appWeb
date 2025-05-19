import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http';
import { ApiKeyInterceptor } from './api-key.interceptor';

describe('ApiKeyInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: ApiKeyInterceptor,
          multi: true
        }
      ]
    });
  });

  it('should be created', () => {
    const interceptor = TestBed.inject(ApiKeyInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
