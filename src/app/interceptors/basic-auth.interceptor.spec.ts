
import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http';
import { BasicAuthInterceptor } from './basic-auth.interceptor';

describe('BasicAuthInterceptor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: HTTP_INTERCEPTORS,
          useClass: BasicAuthInterceptor,
          multi: true
        }
      ]
    });
  });
  
  it('should be created', () => {
    const interceptor = TestBed.inject(BasicAuthInterceptor);
    expect(interceptor).toBeTruthy();
  });
});
