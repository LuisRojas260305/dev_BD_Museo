// Tests unitarios SSL — Session Context Layer
// Ejecutar: node --test Backend/shared/__tests__/sslContext.test.js
const { describe, it, before, after, afterEach } = require('node:test');
const assert = require('node:assert');
const { createContext, getContext, addView, expiro } = require('../sslContext');

const TTL_CORTO = 1; // 1 segundo para tests de expiración

describe('SSL — Session Context Layer', () => {
    describe('createContext', () => {
        it('debe crear un contexto con ssl_id UUID', () => {
            const ctx = createContext();
            assert.ok(ctx.ssl_id, 'Debe tener ssl_id');
            assert.match(ctx.ssl_id, /^[0-9a-f-]{36}$/, 'ssl_id debe ser UUID v4');
        });

        it('debe incluir creado_en y ultima_actividad como ISO timestamps', () => {
            const ctx = createContext();
            assert.ok(ctx.creado_en, 'Debe tener creado_en');
            assert.ok(ctx.ultima_actividad, 'Debe tener ultima_actividad');
            assert.doesNotThrow(() => new Date(ctx.creado_en), 'creado_en debe ser fecha válida');
        });

        it('debe iniciar con vistas vacías', () => {
            const ctx = createContext();
            assert.deepStrictEqual(ctx.vistas, []);
        });

        it('debe aceptar TTL personalizado', () => {
            const ctx = createContext(7200);
            assert.strictEqual(ctx.ttl, 7200);
        });

        it('debe usar TTL default de 3600 si no se especifica', () => {
            const ctx = createContext();
            assert.strictEqual(ctx.ttl, 3600);
        });
    });

    describe('getContext', () => {
        it('debe retornar el contexto si no ha expirado', () => {
            const ctx = createContext();
            const obtenido = getContext(ctx.ssl_id);
            assert.ok(obtenido);
            assert.strictEqual(obtenido.ssl_id, ctx.ssl_id);
        });

        it('debe retornar null si el contexto no existe', () => {
            const result = getContext('no-existe');
            assert.strictEqual(result, null);
        });

        it('debe retornar null si el contexto expiró', async () => {
            const ctx = createContext(TTL_CORTO);
            // Esperar a que expire
            await new Promise(r => setTimeout(r, 1100));
            const obtenido = getContext(ctx.ssl_id);
            assert.strictEqual(obtenido, null);
        });
    });

    describe('addView', () => {
        it('debe agregar una vista al contexto', () => {
            const ctx = createContext();
            const actualizado = addView(ctx.ssl_id, 'obra-123', 'detalle');
            assert.ok(actualizado);
            assert.strictEqual(actualizado.vistas.length, 1);
            assert.strictEqual(actualizado.vistas[0].obra_id, 'obra-123');
            assert.strictEqual(actualizado.vistas[0].tipo_vista, 'detalle');
        });

        it('debe usar tipo_vista por defecto "detalle" si no se especifica', () => {
            const ctx = createContext();
            const actualizado = addView(ctx.ssl_id, 'obra-456');
            assert.strictEqual(actualizado.vistas[0].tipo_vista, 'detalle');
        });

        it('debe retornar null si el contexto no existe', () => {
            const result = addView('no-existe', 'obra-123');
            assert.strictEqual(result, null);
        });

        it('debe retornar null si el contexto expiró', async () => {
            const ctx = createContext(TTL_CORTO);
            await new Promise(r => setTimeout(r, 1100));
            const result = addView(ctx.ssl_id, 'obra-expirada');
            assert.strictEqual(result, null);
        });

        it('debe acumular múltiples vistas', () => {
            const ctx = createContext();
            addView(ctx.ssl_id, 'obra-1', 'detalle');
            addView(ctx.ssl_id, 'obra-2', 'miniatura');
            addView(ctx.ssl_id, 'obra-3', 'detalle');
            const actual = getContext(ctx.ssl_id);
            assert.strictEqual(actual.vistas.length, 3);
        });

        it('debe actualizar ultima_actividad al agregar vista', () => {
            const ctx = createContext();
            const antes = ctx.ultima_actividad;
            // esperar 10ms para que el timestamp cambie
            const actualizado = addView(ctx.ssl_id, 'obra-nueva');
            assert.ok(new Date(actualizado.ultima_actividad) >= new Date(antes));
        });
    });

    describe('expiro', () => {
        it('debe retornar false para contexto activo', () => {
            const ctx = createContext();
            assert.strictEqual(expiro(ctx.ssl_id), false);
        });

        it('debe retornar true para contexto inexistente', () => {
            assert.strictEqual(expiro('no-existe'), true);
        });

        it('debe retornar true para contexto expirado', async () => {
            const ctx = createContext(TTL_CORTO);
            await new Promise(r => setTimeout(r, 1100));
            assert.strictEqual(expiro(ctx.ssl_id), true);
        });
    });
});
