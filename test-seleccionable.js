#!/usr/bin/env node

/**
 * Script de prueba para PDFs con texto seleccionable
 * Uso: node test-seleccionable.js <ruta-al-pdf>
 */

const { extraerDatosConOCR } = require('./ipc-ocr-handler-seleccionable');
const path = require('path');

// Colores
const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(msg, color = 'white') {
  console.log(`${c[color]}${msg}${c.reset}`);
}

function box(title, color = 'cyan') {
  const width = 70;
  const padding = Math.floor((width - title.length - 2) / 2);
  console.log(c[color] + '╔' + '═'.repeat(width) + '╗');
  console.log('║' + ' '.repeat(padding) + title + ' '.repeat(width - padding - title.length) + '║');
  console.log('╚' + '═'.repeat(width) + '╝' + c.reset);
}

function separator() {
  console.log(c.dim + '─'.repeat(72) + c.reset);
}

async function testPDFSeleccionable(pdfPath) {
  box('TEST PDF CON TEXTO SELECCIONABLE', 'cyan');
  
  log(`\n📄 Archivo: ${path.basename(pdfPath)}`, 'cyan');
  log(`📁 Ruta: ${pdfPath}`, 'dim');
  
  const inicio = Date.now();
  
  try {
    const resultado = await extraerDatosConOCR(pdfPath);
    
    const duracion = ((Date.now() - inicio) / 1000).toFixed(1);
    
    separator();
    box('RESULTADO FINAL', 'bright');
    separator();
    
    if (resultado.success) {
      log('\n✓ EXTRACCIÓN EXITOSA', 'green');
      
      if (resultado.metadata) {
        log(`\n📊 Método utilizado: ${resultado.metadata.metodo}`, 'cyan');
        log(`📈 Campos encontrados: ${resultado.metadata.camposEncontrados}/6`, 'cyan');
        if (resultado.metadata.paginas) {
          log(`📄 Páginas procesadas: ${resultado.metadata.paginas}`, 'cyan');
        }
      }
      
      log('\n╔════════════════════════════════════════════════════════════╗', 'green');
      log('║                    DATOS EXTRAÍDOS                         ║', 'green');
      log('╚════════════════════════════════════════════════════════════╝', 'green');
      
      const datos = resultado.datos;
      
      console.log('');
      if (datos.numero) {
        log(`  📌 Número Completo:      ${datos.numero}`, 'white');
      }
      if (datos.puntoVenta) {
        log(`  🏢 Punto de Venta:       ${datos.puntoVenta}`, 'white');
      }
      if (datos.numeroComprobante) {
        log(`  🔢 Nro. Comprobante:     ${datos.numeroComprobante}`, 'white');
      }
      if (datos.monto !== undefined) {
        log(`  💰 Importe Total:        $${datos.monto.toLocaleString('es-AR', {minimumFractionDigits: 2})}`, 'white');
      }
      if (datos.fecha) {
        log(`  📅 Fecha Emisión:        ${datos.fecha}`, 'white');
      }
      if (datos.cuit) {
        log(`  🆔 CUIT:                 ${datos.cuit}`, 'white');
      }
      if (datos.razonSocial) {
        log(`  👤 Razón Social:         ${datos.razonSocial}`, 'white');
      }
      
      // Verificación contra datos esperados
      separator();
      log('\n📋 VERIFICACIÓN DE DATOS ESPERADOS:', 'yellow');
      separator();
      
      const esperados = {
        puntoVenta: '00003',
        numeroComprobante: '00000813',
        numero: '00003-00000813',
        monto: 28100.00,
        fecha: '12/02/2025',
        cuit: '20115999312'
      };
      
      let correctos = 0;
      let total = 0;
      
      for (const [campo, valorEsperado] of Object.entries(esperados)) {
        if (datos[campo] !== undefined) {
          total++;
          const match = datos[campo] == valorEsperado;
          const icono = match ? '✓' : '✗';
          const color = match ? 'green' : 'yellow';
          
          log(`  ${icono} ${campo.padEnd(20)} | Esperado: ${String(valorEsperado).padEnd(15)} | Obtenido: ${datos[campo]}`, color);
          
          if (match) correctos++;
        }
      }
      
      if (total > 0) {
        separator();
        const porcentaje = Math.round((correctos / total) * 100);
        log(`\n📊 Precisión: ${correctos}/${total} campos correctos (${porcentaje}%)`, 
            porcentaje === 100 ? 'green' : porcentaje >= 70 ? 'yellow' : 'red');
      }
      
    } else {
      log('\n✗ EXTRACCIÓN FALLIDA', 'red');
      log(`\n❌ Error: ${resultado.error}`, 'red');
      
      if (resultado.datosExtraidos) {
        log('\n⚠️  Datos parciales extraídos:', 'yellow');
        console.log(JSON.stringify(resultado.datosExtraidos, null, 2));
      }
      
      if (resultado.textoExtraido) {
        log('\n📝 Texto extraído (primeros 500 chars):', 'dim');
        log(resultado.textoExtraido.substring(0, 500), 'dim');
      }
    }
    
    separator();
    log(`\n⏱️  Tiempo total: ${duracion} segundos`, 'cyan');
    separator();
    
    // Nota especial para PDFs seleccionables
    log('\n💡 NOTA IMPORTANTE:', 'blue');
    log('Si puedes copiar/pegar texto del PDF manualmente, este método debería funcionar.', 'white');
    log('Si no funciona, el PDF podría estar protegido o tener formato especial.', 'yellow');
    
  } catch (error) {
    log('\n❌ ERROR DURANTE LA PRUEBA', 'red');
    log(`\nError: ${error.message}`, 'red');
    log(`\nStack:\n${error.stack}`, 'dim');
  }
  
  console.log('');
}

// Ejecutar
const pdfPath = process.argv[2];

if (!pdfPath) {
  box('USO DEL SCRIPT', 'yellow');
  log('\nUso: node test-seleccionable.js <ruta-al-pdf>', 'white');
  log('\nEjemplo:', 'cyan');
  log('  node test-seleccionable.js "./facturas/2- Febrero -814.pdf"', 'dim');
  log('\nEste script está optimizado para PDFs donde puedes seleccionar y copiar texto.', 'yellow');
  console.log('');
  process.exit(1);
}

testPDFSeleccionable(pdfPath);
