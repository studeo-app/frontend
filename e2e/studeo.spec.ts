import { test, expect } from '@playwright/test';

test('Flujo completo E2E: Registro (si no existe), Logout, Login, Crear Sala, Chat y Controles WebRTC', async ({ page }) => {
  // Capturar logs y errores del navegador para depuración
  page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[Browser Error] ${err.message}`));

  const testEmail = 'e2e_user@miuniversidad.edu';
  const testPassword = 'Password123!'; // Mayúscula, número y símbolo
  const uniqueUsername = `e2e_${Date.now().toString().slice(-8)}`;

  // --- PASO 1: REGISTRO (CON CAPTURA DE ERROR SI YA EXISTE) ---
  console.log('Intentando registrar usuario en /register...');
  await page.goto('/register');

  await page.fill('#firstName', 'Usuario');
  await page.fill('#lastName', 'E2E');
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.fill('#confirmPassword', testPassword);

  // Intentamos registrar
  await page.click('button[type="submit"]');

  // Helper para completar el perfil si el sistema nos redirige ahí
  const completarPerfilSiEsNecesario = async () => {
    if (page.url().includes('complete-profile') || page.url().includes('profile')) {
      console.log('Detectada pantalla de completar perfil. Rellenando datos...');
      await page.waitForSelector('#username', { timeout: 5000 }).catch(() => {});
      if (await page.locator('#username').isVisible()) {
        await page.fill('#username', uniqueUsername);
        // Intentar seleccionar un avatar si el botón existe
        const avatarBtn = page.locator('button[aria-label*="Seleccionar avatar"], .avatar-option').first();
        if (await avatarBtn.isVisible()) {
          await avatarBtn.click();
        }
        // Esperar a que el botón se habilite (el chequeo de disponibilidad de username es asíncrono)
        const submitBtn = page.locator('button[type="submit"]');
        await expect(submitBtn).toBeEnabled({ timeout: 5000 });
        
        // Enviar formulario de completar perfil
        await submitBtn.click();
      }
    }
  };

  // Esperamos a ver si el registro tiene éxito (cambia la URL)
  try {
    await page.waitForURL(url => {
      const p = url.pathname;
      return p.includes('dashboard') || p.includes('profile') || p.includes('complete-profile');
    }, { timeout: 8000 });
    
    console.log('Registro completado o redirigido con éxito.');
    await completarPerfilSiEsNecesario();
  } catch (e) {
    console.log('No se redirigió tras el registro. Probando a iniciar sesión (asumiendo que ya existe)...');
    await page.goto('/login');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]');
    
    // Esperar un momento a que cambie la URL después del login
    await page.waitForURL(url => {
      return url.pathname.includes('dashboard') || url.pathname.includes('profile') || url.pathname.includes('complete-profile');
    }, { timeout: 8000 }).catch(() => {});
    
    // Si al loguear nos manda a completar perfil, lo hacemos
    await completarPerfilSiEsNecesario();
  }

  // Esperar estar en el Dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  // Esperar a que el esqueleto de carga de salas desaparezca de la pantalla
  await page.waitForSelector('[aria-busy="true"]', { state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000); // Margen para renderizado
  console.log('Sesión iniciada con éxito en el Dashboard.');
  await page.screenshot({ path: 'playwright-screenshots/1-dashboard.png' });

  // --- PASO 2: CERRAR SESIÓN ---
  console.log('Cerrando sesión...');
  const cerrarSesionBtn = page.locator('button[aria-label="Cerrar sesión"], button:has-text("Cerrar sesión")').first();
  await expect(cerrarSesionBtn).toBeVisible();
  await cerrarSesionBtn.click();

  // Esperar a volver al Login
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  console.log('Cierre de sesión verificado.');
  await page.screenshot({ path: 'playwright-screenshots/2-login-again.png' });

  // --- PASO 3: INICIAR SESIÓN DE NUEVO ---
  console.log('Iniciando sesión nuevamente para validar persistencia...');
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  // Esperar de nuevo que cargue el dashboard
  await page.waitForSelector('[aria-busy="true"]', { state: 'detached', timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // 4. CREAR SALA
  console.log('Creando una nueva sala...');
  // Puede decir "Crear mi primer espacio", "Crear sala" (en estado vacío) o "Nueva Sala" (en la grilla de salas)
  const crearSalaBtn = page.locator('button:has-text("Crear"), button:has-text("Nueva Sala")').first();
  await expect(crearSalaBtn).toBeVisible();
  await crearSalaBtn.click();

  await expect(page.locator('#room-name')).toBeVisible();
  await page.fill('#room-name', `Sala de Estudio E2E ${Date.now()}`);
  
  // Enviar el formulario haciendo click en "Crear Sala" (dentro del modal)
  await page.click('button:has-text("Crear Sala")');

  // Si sale el modal de éxito, hacemos click en continuar/cerrar
  const successCloseBtn = page.locator('button:has-text("Continuar"), button:has-text("Entendido"), button:has-text("Aceptar"), button:has-text("Listo")').first();
  // Esperar a que el modal de éxito aparezca y esté visible antes de hacer click
  await successCloseBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await successCloseBtn.isVisible()) {
    await successCloseBtn.click();
  }

  // Esperar a entrar a la sala (o al lobby)
  await expect(page).toHaveURL(/\/room\//, { timeout: 15000 });
  console.log('Ingreso a la sala o lobby verificado.');

  // Si nos encontramos en la pantalla del lobby, hacemos clic en "Entrar a la sala" para pasar al salón principal
  if (page.url().includes('/lobby')) {
    console.log('En el Lobby de la sala. Esperando a que se carguen los dispositivos reales...');
    await page.waitForTimeout(2000);
    console.log('Haciendo clic en "Entrar a la sala"...');
    const entrarSalaBtn = page.locator('button:has-text("Entrar a la sala")');
    await expect(entrarSalaBtn).toBeVisible({ timeout: 5000 });
    await entrarSalaBtn.click();
  }

  // Esperar a que la URL cambie al salón principal (sin /lobby)
  await page.waitForURL(url => url.pathname.includes('/room/') && !url.pathname.includes('/lobby'), { timeout: 10000 });
  console.log('Redirección al salón principal confirmada.');

  // Realizamos una recarga limpia de la página para resetear cualquier estado sucio de los sockets y dispositivos WebRTC de la transición
  console.log('Recargando la página para asegurar una conexión de sockets limpia y evitar errores de hardware...');
  await page.reload();

  // --- PASO 5: CHAT EN TIEMPO REAL ---
  // Esperar a que el input del chat esté visible (lo que indica que la sala cargó tras el reload)
  const chatInput = page.locator('input[aria-label="Escribir un mensaje en el chat"]');
  await expect(chatInput).toBeVisible({ timeout: 12000 });

  // Esperar 4 segundos adicionales para asegurar que el socket ha completado el joinRoom en el servidor
  await page.waitForTimeout(4000);

  // Tomamos la captura de pantalla de la sala con los participantes cargados
  console.log('Tomando captura de pantalla de la sala cargada...');
  await page.screenshot({ path: 'playwright-screenshots/3-inside-room.png' });

  console.log('Enviando mensaje al chat...');
  await chatInput.fill('Mensaje de prueba E2E: ¡Hola a todos!');
  await page.click('button[title="Enviar"]');
  
  // Validamos que el mensaje aparezca
  await expect(page.locator('text=Mensaje de prueba E2E: ¡Hola a todos!').last()).toBeVisible();
  await page.waitForTimeout(1500); // Pequeña espera para que se dibuje el chat completamente
  console.log('Chat verificado exitosamente.');
  await page.screenshot({ path: 'playwright-screenshots/4-chat-sent.png' });

  // --- PASO 6: CONTROLES WEBRTC (AUDIO, CÁMARA, PANTALLA) ---
  console.log('Probando controles multimedia (WebRTC)...');

  // Activar/Silenciar Micrófono
  const micBtn = page.locator('button[aria-label*="micrófono"], button[title*="micrófono"]').first();
  await expect(micBtn).toBeVisible();
  await micBtn.click();
  console.log('Toggle de Micrófono pulsado.');

  // Activar/Apagar Cámara
  const camBtn = page.locator('button[aria-label*="cámara"], button[title*="cámara"]').first();
  await expect(camBtn).toBeVisible();
  await camBtn.click();
  console.log('Toggle de Cámara pulsado.');

  // Activar/Dejar de compartir pantalla
  const screenBtn = page.locator('button[aria-label*="pantalla"], button[title*="pantalla"]').first();
  await expect(screenBtn).toBeVisible();
  await screenBtn.click();
  console.log('Toggle de Compartir pantalla pulsado.');

  // Esperar 4 segundos para que se rendericen los streams multimedia y no quede en negro
  await page.waitForTimeout(4000);

  // Tomamos una captura final del estado de los controles de video y audio
  await page.screenshot({ path: 'playwright-screenshots/5-media-toggled.png' });
  console.log('¡Prueba E2E completada con éxito!');
});
