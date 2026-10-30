export function getEstadoPrestamoClass(estadoNombre: string = ''): string {
  const estado = estadoNombre.toLowerCase();
  switch (estado) {
    case 'activo': return 'status-activo';
    case 'devuelto':
    case 'devuelto a tiempo':
    case 'completado a tiempo': return 'status-devuelto';
    case 'atrasado':
    case 'devuelto tarde':
    case 'completado con retardo': return 'status-atrasado';
    case 'parcialmente devuelto': return 'status-parcial';
    default: return 'status-desconocido';
  }
}
