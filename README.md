# Mundial 2026 · AsesorarSeg te asegura la info

Fixture interactivo de la Copa Mundial FIFA 2026 (USA · Canadá · México). Cortesía de **AsesorarSeg** — Asesoramiento Corporativo en Seguridad.

- 12 grupos · 48 selecciones · 16 sedes · 104 partidos.
- Tabla de posiciones que se recalcula sola al cargar resultados.
- Fixture con filtros por fase y por grupo.
- Sedes con foto, año, capacidad y dato de cada ciudad.
- Bracket de eliminatorias (16avos → final).

## Persistencia

Los resultados que carga el visitante se guardan en el `localStorage` de su navegador. No hay backend — cada usuario tiene su prode privado.

## Desarrollo local

```bash
python -m http.server 8123 --directory .
```

Después abrir `http://localhost:8123`.

## Deploy

Hosting estático. Render lee `render.yaml` automáticamente al conectar el repo. También funciona en Netlify, Vercel, GitHub Pages o Cloudflare Pages sin configuración extra.
