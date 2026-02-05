// Funciones utilitarias globales

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function showAlert(message: string, type: 'success' | 'error' | 'info' = 'info') {
  // Crear elemento de alerta
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#2563eb';
  alert.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    background: ${bgColor};
    color: white;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 3000;
    animation: slideIn 0.3s;
  `;
  alert.textContent = message;
  
  document.body.appendChild(alert);
  
  setTimeout(() => {
    alert.style.animation = 'slideOut 0.3s';
    setTimeout(() => alert.remove(), 300);
  }, 3000);
}

export function confirmAction(message: string, callback: () => void) {
  if (confirm(message)) {
    callback();
  }
}

// Agregar estilos de animación si no existen
if (typeof window !== 'undefined' && !document.getElementById('alert-styles')) {
  const style = document.createElement('style');
  style.id = 'alert-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

