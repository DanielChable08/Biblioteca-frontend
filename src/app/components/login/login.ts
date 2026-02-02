import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ImageModule } from 'primeng/image';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    ImageModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export default class Login implements OnInit {
  loginForm: FormGroup;
  loading = false;
  returnUrl: string = '/admin';
  
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin';
    
    if (this.authService.isAuthenticated()) {
      const role = this.authService.getUserRole();
      this.router.navigate([role === 'ADMIN' ? '/admin' : '/dashboard']);
    }

    this.route.queryParams.subscribe(params => {
      if (params['expired'] === 'true') {
        this.messageService.add({
          severity: 'warn',
          summary: 'Sesión Expirada',
          detail: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
          life: 5000
        });
      }
    });
  }

  onLogin() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor completa todos los campos'
      });
      return;
    }

    this.loading = true;
    const credentials = this.loginForm.value;

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.loading = false;
        const role = this.authService.getUserRole();
        const fullName = this.authService.getFullName();
        
        this.messageService.add({
          severity: 'success',
          summary: 'Bienvenido',
          detail: `Hola ${fullName}`,
          life: 2000
        });

        const targetUrl = role === 'ADMIN' ? this.returnUrl : '/dashboard';
        this.router.navigate([targetUrl]);
      },
      error: (err) => {
        this.loading = false;
        let errorMessage = 'Error al intentar iniciar sesión';
        let errorDetail = 'Por favor, intenta nuevamente';

        if (err.status === 0) {
          errorMessage = 'Servidor no disponible';
          errorDetail = 'No se pudo conectar con el servidor. Verifica tu conexión o contacta al administrador.';
        } else if (err.status === 401) {
          errorMessage = 'Credenciales incorrectas';
          errorDetail = 'El email o contraseña son incorrectos.';
        } else if (err.status === 500) {
          errorMessage = 'Error del servidor';
          errorDetail = 'Ocurrió un error en el servidor. Contacta al administrador.';
        } else if (err.status === 403) {
          errorMessage = 'Acceso denegado';
          errorDetail = 'No tienes permisos para acceder al sistema.';
        } else {
          errorDetail = err.error?.message || 'Error inesperado. Intenta nuevamente.';
        }
        
        this.messageService.add({
          severity: 'error',
          summary: errorMessage,
          detail: errorDetail,
          life: 5000
        });
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }
}
