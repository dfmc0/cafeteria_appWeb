import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class BasicAuthInterceptor implements HttpInterceptor {
  private username = 'admin';
  private password = 'admin';

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authToken = btoa(`${this.username}:${this.password}`);
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Basic ${authToken}`
      }
    });
    return next.handle(authReq);
  }
}