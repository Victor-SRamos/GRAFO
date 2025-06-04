let cy;
let edgesData = [];
let selectedNodeForEdge = null;
let isOriented = false;

window.onload = init;

function init() {
  cy = cytoscape({
    container: document.getElementById('cy'),
    style: getCyStyle(),
    elements: [],
    layout: { name: 'preset' }
  });

  cy.on('tap', (event) => {
    if (event.target === cy) {
      const pos = event.position;
      const id = prompt("ID do novo nó:");
      if (!id) return;
      if (cy.getElementById(id).length) {
        alert("ID já existe!");
        return;
      }
      const label = prompt("Nome (rótulo) do nó a ser exibido:", id) || id;
      cy.add({ group: 'nodes', data: { id, label, color: 'blue' }, position: pos });
      clearOutputs();
      showAdjacency();
    }
  });

  cy.on('tap', 'node', (event) => {
    const node = event.target;
    if (selectedNodeForEdge == null) {
      selectedNodeForEdge = node.id();
      alert(`Selecionado nó "${selectedNodeForEdge}" para conectar. Clique no próximo nó.`);
    } else {
      const source = selectedNodeForEdge;
      const target = node.id();
      if (source === target) {
        alert("Não pode conectar nó a ele mesmo.");
        selectedNodeForEdge = null;
        return;
      }
      const weightStr = prompt(`Peso da aresta de ${source} para ${target}:`, "1");
      const weight = parseFloat(weightStr);
      if (isNaN(weight) || weight < 0) {
        alert("Peso inválido!");
        selectedNodeForEdge = null;
        return;
      }
      const edgeId = source + "_" + target + "_" + Date.now();
      edgesData.push({ source, target, weight, id: edgeId });
      selectedNodeForEdge = null;
      drawEdges();
      showAdjacency();
      clearOutputs();
    }
  });

  cy.on('tap', 'edge', (event) => {
    const edge = event.target;
    const edgeData = edgesData.find(e => e.id === edge.id());
    if (!edgeData) return;
    const action = prompt(`Aresta ${edgeData.source} → ${edgeData.target} (Peso: ${edgeData.weight})\nDigite:\n1 para editar peso\n2 para remover aresta`);
    if (action === "1") {
      const newWeightStr = prompt("Novo peso:", edgeData.weight);
      const newWeight = parseFloat(newWeightStr);
      if (isNaN(newWeight) || newWeight < 0) {
        alert("Peso inválido!");
        return;
      }
      edgeData.weight = newWeight;
      drawEdges();
      showAdjacency();
      clearOutputs();
    } else if (action === "2") {
      const confirmDelete = confirm("Deseja realmente remover esta aresta?");
      if (confirmDelete) {
        edgesData = edgesData.filter(e => e.id !== edge.id());
        drawEdges();
        showAdjacency();
        clearOutputs();
      }
    }
  });

  document.getElementById('btnShortest').onclick = () => {
    const route = findShortestRoute();
    showRouteResult('Menor Rota', route);
  };
  document.getElementById('btnLongest').onclick = () => {
    const route = findLongestRoute();
    showRouteResult('Maior Rota', route);
  };
  document.getElementById('btnAllRoutes').onclick = () => {
    const routes = findAllRoutes();
    showAllRoutesResult(routes);
  };
  document.getElementById('btnImportMatrix').onclick = () => {
    importMatrixFromInput();
  };
  document.getElementById('orientToggle').onchange = (e) => {
    isOriented = e.target.checked;
    updateEdgeStyle();
  };
  document.getElementById('btnClearGraph').onclick = () => {
    const confirmClear = confirm("Tem certeza que deseja apagar todo o grafo?");
    if (confirmClear) clearGraph();
  };

  showAdjacency();
  clearOutputs();
}

function clearGraph() {
  cy.elements().remove();
  edgesData = [];
  clearOutputs();
  showAdjacency();
}

function getCyStyle() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'label': 'data(label)',
        'text-valign': 'center',
        'color': '#fff',
        'text-outline-width': 2,
        'text-outline-color': '#555',
        'width': 40,
        'height': 40,
        'font-size': 14,
        'font-weight': 'bold',
        'overlay-padding': 5,
        'z-index': 10
      }
    },
    {
      selector: 'edge',
      style: {
        'curve-style': 'bezier',
        'target-arrow-shape': isOriented ? 'triangle' : 'none',
        'target-arrow-color': 'data(color)',
        'line-color': 'data(color)',
        'width': 3,
        'label': 'data(weight)',
        'font-size': 12,
        'color': 'data(color)',
        'text-background-color': '#eee',
        'text-background-opacity': 0.8,
        'text-background-padding': 2,
        'text-rotation': 'autorotate',
        'text-margin-y': -8
      }
    }
  ];
}

function updateEdgeStyle() {
  cy.style()
    .selector('edge')
    .style('target-arrow-shape', isOriented ? 'triangle' : 'none')
    .update();
  clearOutputs();
  showAdjacency();
}

function drawEdges() {
  cy.edges().remove();
  edgesData.forEach(e => {
    cy.add({
      group: 'edges',
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        weight: e.weight === 0 ? "00" : e.weight.toString(),
        color: e.weight === 0 ? 'red' : '#888'
      }
    });
  });
  cy.layout({ name: 'preset' }).run();
  updateEdgeStyle();
}

function getNodes() {
  return cy.nodes().map(n => n.id());
}

function showAdjacency() {
  const nodes = getNodes();
  const n = nodes.length;
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));

  edgesData.forEach(e => {
    const i = nodes.indexOf(e.source);
    const j = nodes.indexOf(e.target);
    if (i >= 0 && j >= 0) {
      matrix[i][j] += e.weight;
      if (!isOriented && i !== j) matrix[j][i] += e.weight;
    }
  });

  let s = "Matriz de Adjacência:\n     ";
  s += nodes.map(id => id.padEnd(4)).join(" ") + "\n";
  for (let i = 0; i < n; i++) {
    s += nodes[i].padEnd(4) + " ";
    for (let j = 0; j < n; j++) {
      let val = matrix[i][j];
      let displayVal = val < 10 ? "0" + val : val.toString();
      s += displayVal.padEnd(4) + " ";
    }
    s += "\n";
  }
  document.getElementById('adjacencyMatrix').textContent = s;
}

function clearOutputs() {
  document.getElementById('routeResults').textContent = "";
}

function resolveNodeId(input) {
  if (!input) return null;
  const node = cy.nodes().find(n =>
    n.id() === input || n.data('label') === input
  );
  return node ? node.id() : null;
}

function findAllRoutes() {
  const originInput = prompt("Informe o nó de origem (ID ou Nome):");
  const destInput = prompt("Informe o nó de destino (ID ou Nome):");

  const origin = resolveNodeId(originInput);
  const dest = resolveNodeId(destInput);

  if (!origin || !dest) {
    alert("Origem ou destino inválido.");
    return [];
  }

  let results = [];

  function dfs(current, end, path, weightSum) {
    if (current === end) {
      results.push({ path: [...path], weight: weightSum });
      return;
    }
    edgesData.forEach(e => {
      if (e.source === current && !path.includes(e.target)) {
        dfs(e.target, end, [...path, e.target], weightSum + e.weight);
      }
      if (!isOriented && e.target === current && !path.includes(e.source)) {
        dfs(e.source, end, [...path, e.source], weightSum + e.weight);
      }
    });
  }

  dfs(origin, dest, [origin], 0);
  return results;
}

function findShortestRoute() {
  const routes = findAllRoutes();
  if (routes.length === 0) return null;
  return routes.reduce((a, b) => a.weight < b.weight ? a : b);
}

function findLongestRoute() {
  const routes = findAllRoutes();
  if (routes.length === 0) return null;
  return routes.reduce((a, b) => a.weight > b.weight ? a : b);
}

function showRouteResult(title, route) {
  const output = document.getElementById('routeResults');
  if (!route) {
    output.textContent = `${title}: Nenhuma rota encontrada.`;
    return;
  }
  output.textContent = `${title}: ${route.path.join(" → ")} | Peso: ${route.weight}`;
}

function showAllRoutesResult(routes) {
  const output = document.getElementById('routeResults');
  if (routes.length === 0) {
    output.textContent = "Nenhuma rota encontrada.";
    return;
  }
  let s = `Todas rotas (${routes.length}):\n`;
  routes.forEach((r, i) => {
    s += `${i + 1}. ${r.path.join(" → ")} | Peso: ${r.weight}\n`;
  });
  output.textContent = s;
}

function importMatrixFromInput() {
  const input = document.getElementById('matrixInput').value.trim();
  if (!input) return alert("Digite a matriz para importar.");

  const parts = input.split(';').map(x => x.trim()).filter(x => x.length > 0);
  if (parts.length === 0) {
    alert("Entrada inválida.");
    return;
  }

  cy.elements().remove();
  edgesData = [];

  const nodesSet = new Set();
  for (const part of parts) {
    const edgeParts = part.split(',');
    if (edgeParts.length < 3) {
      alert("Formato inválido, deve ser: origem,destino,peso");
      return;
    }
    const [source, target, weightStr] = edgeParts.map(s => s.trim());
    const weight = parseFloat(weightStr);
    if (isNaN(weight) || weight < 0) {
      alert("Peso inválido em: " + part);
      return;
    }
    nodesSet.add(source);
    nodesSet.add(target);
    edgesData.push({
      source, target, weight,
      id: source + "_" + target + "_" + Date.now() + Math.random()
    });
  }

  nodesSet.forEach(id => {
    cy.add({
      group: 'nodes',
      data: { id, label: id, color: 'blue' },
      position: { x: 50 + Math.random() * 700, y: 50 + Math.random() * 400 }
    });
  });
  drawEdges();
  showAdjacency();
  clearOutputs();
}
