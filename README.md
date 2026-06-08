<div align="center">
  <br/>
  <img src="favicon.svg" width="64" height="64" alt="BioRed-Explorer"/>
  <h1 align="center">BioRed-Explorer</h1>
  <p align="center">
    Visualizador interactivo de redes biológicas<br/>
    construido con Cytoscape.js · React · TypeScript
  </p>
  <p>
    <a href="#-características">Características</a> •
    <a href="#-uso">Uso</a> •
    <a href="#-stack">Stack</a> •
    <a href="#-despliegue">Despliegue</a>
  </p>
  <br/>
</div>

## ✦ Características

- **Visualización de redes** — grafo interactivo con diseño circular, cola, grid o cose
- **Camino más corto (Dijkstra)** — selecciona dos nodos (con <kbd>Shift</kbd>+click o modo Dijkstra) y obtén la ruta óptima
- **Árbol de Expansión Mínima (Kruskal)** — resalta las aristas del MST directamente sobre el grafo
- **Simulación de ataques** — modos single, cascada y aleatorio; análisis de robustez post-ataque
- **Editor JSON en vivo** — modifica nodos y aristas desde el panel lateral y aplica los cambios al grafo
- **Historial de grafos** — los grafos cargados se guardan en el historial para acceder rápidamente
- **Modo oscuro / claro** — alterna entre temas con un clic

## ✦ Uso

```bash
pnpm install
pnpm run dev       # desarrollo  → http://localhost:5173/BioRed/
pnpm run build     # producción  → dist/
```

## ✦ Stack

| Herramienta      | Propósito                     |
|------------------|-------------------------------|
| [Vite](https://vitejs.dev)           | Bundler y dev server          |
| [React](https://react.dev)           | UI                            |
| [TypeScript](https://typescriptlang.org) | Tipado estático            |
| [Cytoscape.js](https://js.cytoscape.org) | Renderizado de grafos     |
| [Tailwind CSS](https://tailwindcss.com)   | Estilos                      |

## ✦ Despliegue

El proyecto se despliega automáticamente en **GitHub Pages** mediante el workflow `deploy.yml` cada vez que se hace push a la rama `main`.

