import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let logout: jasmine.Spy;
  let navigate: jasmine.Spy;

  beforeEach(() => {
    logout = jasmine.createSpy('logout');
    navigate = jasmine.createSpy('navigate');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'valid-token', logout } },
        { provide: Router, useValue: { navigate } }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('keeps the session for forbidden, missing, and server-error responses', () => {
    const cases = [
      { status: 403, statusText: 'Forbidden' },
      { status: 404, statusText: 'Not Found' },
      { status: 500, statusText: 'Server Error' }
    ];

    for (const testCase of cases) {
      http.get('/sdt/v1/prestamos/loan-uuid').subscribe({ error: () => undefined });
      httpTesting.expectOne('/sdt/v1/prestamos/loan-uuid').flush({}, testCase);
    }

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps the session active when a request fails at the network layer', () => {
    http.get('/sdt/v1/prestamos/loan-uuid').subscribe({ error: () => undefined });
    httpTesting.expectOne('/sdt/v1/prestamos/loan-uuid').error(new ProgressEvent('error'));

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not treat an unclassified 401 as proof that authentication is invalid', () => {
    http.get('/sdt/v1/prestamos/loan-uuid').subscribe({ error: () => undefined });
    httpTesting.expectOne('/sdt/v1/prestamos/loan-uuid').flush(
      { message: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(logout).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out only when the API marks a 401 as invalid authentication', () => {
    http.get('/sdt/v1/prestamos/loan-uuid').subscribe({ error: () => undefined });
    httpTesting.expectOne('/sdt/v1/prestamos/loan-uuid').flush(
      { error: 'No autorizado', code: 'INVALID_AUTHENTICATION', message: 'Token inválido o expirado' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(logout).toHaveBeenCalledOnceWith(false);
    expect(navigate).toHaveBeenCalledOnceWith(['/login'], { queryParams: { expired: 'true' } });
  });
});
