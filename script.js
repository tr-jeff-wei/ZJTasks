let allNodes = [];
let allEdges = [];
let network;
let nodesDataset;
let edgesDataset;
let rawData;
let tasksData;

const groupStyles = {
  basic: { color: "#0bcaf5ff", shape: "dot", size: 24 },
  intermediate  : { color: "#a6f43fff", shape: "dot", size: 22 },
  root: { color: "#f59e0b", shape: "dot", size: 30 },
  category: { color: "#22c55e", shape: "dot", size: 24 },
  concept: { color: "#38bdf8", shape: "dot", size: 20 },
  data_structure: { color: "#8b5cf6", shape: "dot", size: 22 },
  strategy: { color: "#f97316", shape: "dot", size: 22 },
  algorithm: { color: "#ef4444", shape: "dot", size: 22 },
  technique: { color: "#14b8a6", shape: "dot", size: 20 }
};

async function init() {
  const response = await fetch("knowledge.json");
  const response2 = await fetch("tasks.json");
  rawData = await response.json();
  tasksData = await response2.json();

  // Convert tasksData object to array
  tasksData = Object.entries(tasksData).map(([id, task]) => ({ id, ...task }));

  allNodes = rawData.nodes.map(node => ({
    ...node,
    ...groupStyles[node.group],
    label: `${node.label} (${getListNum(node.id, node.label)})`,
    pNums: getListNum(node.id, node.label),
    font: { color: "#e2e8f0", size: 18, face: "Noto Sans TC" },
    borderWidth: 2
  }));

  allEdges = rawData.edges.map(edge => ({
    id: `${edge.from}->${edge.to}`,
    from: edge.from,
    to: edge.to,
    label: '',///edge.relation,
    arrows: "", // undirected
    color: getEdgeColor(edge.relation),
    font: { color: "#94a3b8", size: 12, align: "middle" },
    width: edge.relation === "contains" ? 2 : 1.5,
    dashes: edge.relation !== "contains",
    smooth: { type: "dynamic" }
  }));

  nodesDataset = new vis.DataSet(allNodes);
  edgesDataset = new vis.DataSet(allEdges);

  const container = document.getElementById("network");
  const data = {
    nodes: nodesDataset,
    edges: edgesDataset
  };

  const options = {
    physics: {
      enabled: true,
      stabilization: false,
      barnesHut: {
        gravitationalConstant: -4500,
        springLength: 170,
        springConstant: 0.03,
        damping: 0.2
      }
    },
    interaction: {
      hover: true,
      tooltipDelay: 100,
      multiselect: false,
      navigationButtons: true,
      keyboard: true
    },
    nodes: {
      shadow: true
    },
    edges: {
      shadow: false
    }
  };

  network = new vis.Network(container, data, options);

  network.on("click", params => {
    if (params.nodes.length > 0) {
      const nodeId = params.nodes[0];
      showNodeInfo(nodeId);
      highlightConnected(nodeId);
    } else {
      clearHighlight();
    }
  });

  network.once("stabilizationIterationsDone", () => {
    network.fit({ animation: true });
  });

  bindControls();
}

function getEdgeColor(relation) {
  switch (relation) {
    case "contains": return { color: "#64748b" };
    case "depends_on": return { color: "#facc15" };
    case "uses": return { color: "#38bdf8" };
    case "related_to": return { color: "#fb7185" };
    default: return { color: "#94a3b8" };
  }
}

function bindControls() {
  document.getElementById("searchInput").addEventListener("input", handleSearch);
  document.getElementById("levelFilter").addEventListener("change", handleFilter);
  document.getElementById("resetBtn").addEventListener("click", resetView);
}

function handleSearch(e) {
  const keyword = e.target.value.trim().toLowerCase();
  const level = document.getElementById("levelFilter").value;
  filterGraph(keyword, level);
}

function handleFilter(e) {
  const level = e.target.value;
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  filterGraph(keyword, level);
}

function filterGraph(keyword, level) {
  let filteredNodes = rawData.nodes.filter(node => {
    const matchKeyword =
      !keyword ||
      node.label.toLowerCase().includes(keyword) ||
      node.description.toLowerCase().includes(keyword) ||
      (node.keywords || []).some(k => k.toLowerCase().includes(keyword));

    const matchLevel = level === "all" || node.level === level || node.level === "all";

    return matchKeyword && matchLevel;
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  let filteredEdges = rawData.edges.filter(edge =>
    filteredNodeIds.has(edge.from) && filteredNodeIds.has(edge.to)
  );

  const styledNodes = filteredNodes.map(node => ({
    ...node,
    ...groupStyles[node.group],
    label: `${node.label} (${getListNum(node.id, node.label)})`,
    pNums: getListNum(node.id, node.label),
    font: { color: "#e2e8f0", size: 18, face: "Noto Sans TC" },
    borderWidth: 2
  }));

  const styledEdges = filteredEdges.map(edge => ({
    id: `${edge.from}->${edge.to}`,
    from: edge.from,
    to: edge.to,
    label: "" ,//edge.relation,
    arrows: "", // undirected
    color: getEdgeColor(edge.relation),
    font: { color: "#94a3b8", size: 12, align: "middle" },
    width: edge.relation === "contains" ? 2 : 1.5,
    dashes: edge.relation !== "contains",
    smooth: { type: "dynamic" }
  }));

  nodesDataset.clear();
  edgesDataset.clear();
  nodesDataset.add(styledNodes);
  edgesDataset.add(styledEdges);

  setTimeout(() => network.fit({ animation: true }), 150);
}

function resetView() {
  document.getElementById("searchInput").value = "";
  document.getElementById("levelFilter").value = "all";

  nodesDataset.clear();
  edgesDataset.clear();
  nodesDataset.add(allNodes);
  edgesDataset.add(allEdges);

  clearHighlight();
  clearInfoPanel();

  setTimeout(() => network.fit({ animation: true }), 150);
}

function showNodeInfo(nodeId) {
  const node = rawData.nodes.find(n => n.id === nodeId);
  if (!node) return;

  document.getElementById("nodeTitle").textContent = node.label;
  document.getElementById("nodeGroup").textContent = formatGroup(node.group);
  document.getElementById("nodeDifficulty").textContent = `難度 ${node.difficulty}`;
  document.getElementById("nodeLevel").textContent = formatLevel(node.level);
  document.getElementById("nodeDescription").textContent = node.description || "無說明";

  renderChips("nodeKeywords", node.keywords || []);
  renderList("nodeExamples" ,nodeId ,  node.label);
  // renderRelations(nodeId);
}

function renderChips(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items.length) {
    container.innerHTML = "<span class='chip'>無</span>";
    return;
  }

  items.forEach(item => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    container.appendChild(chip);
  });
}

function getListNum(nodeId , nodeLabel) {
  // 取出 tasks.json 中的 tags 欄位，並找出包含 nodeLabel 的範例
  const items = tasksData.filter(task => task.tags && 
    (task.tags.includes(nodeLabel) || task.tags.includes(nodeId)));
  return items.length;
}

function renderList(containerId , nodeId , nodeLabel) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  // 取出 tasks.json 中的 tags 欄位，並找出包含 nodeLabel 的範例
  const items = tasksData.filter(task => task.tags && (task.tags.includes(nodeLabel) || task.tags.includes(nodeId)))
    .map(task => ({ 
      id: task.id,
      title: task.title, 
      link: `https://zerojudge.tw/ShowProblem?problemid=${task.id}`,
      difficulty: task.difficulty,
      tags: task.tags
    }));

  if (!items.length) {
    container.innerHTML = "<p style='color: #94a3b8;'>無相關範例</p>";
    return;
  }

  // 建立 table
  const table = document.createElement("table");
  table.className = "examples-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  
  const headers = ["題號", "題目", "難度", "標籤"];
  headers.forEach(headerText => {
    const th = document.createElement("th");
    th.textContent = headerText;
    if (headerText === "難度") {
      th.style.cursor = "pointer";
      th.title = "點擊排序";
      th.addEventListener("click", () => sortExamplesTable(table, items, containerId));
    }
    headerRow.appendChild(th);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  items.forEach(item => {
    const row = document.createElement("tr");
    
    const idCell = document.createElement("td");
    idCell.textContent = item.id;
    row.appendChild(idCell);

    const titleCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = item.link;
    link.target = "_blank";
    link.textContent = item.title;
    titleCell.appendChild(link);
    row.appendChild(titleCell);

    const difficultyCell = document.createElement("td");
    difficultyCell.textContent = item.difficulty;
    difficultyCell.className = `difficulty-${item.difficulty.toLowerCase()}`;
    row.appendChild(difficultyCell);

    const tagsCell = document.createElement("td");
    tagsCell.textContent = item.tags.join(", ");
    row.appendChild(tagsCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

let currentSortOrder = "asc";

function sortExamplesTable(table, items, containerId) {
  // 難度排序順序
  const difficultyOrder = { "Easy": 1, "Medium": 2, "Hard": 3 };
  
  // 複製 items 以避免修改原始數據
  const sortedItems = [...items];
  
  if (currentSortOrder === "asc") {
    sortedItems.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
    currentSortOrder = "desc";
  } else {
    sortedItems.sort((a, b) => difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty]);
    currentSortOrder = "asc";
  }

  // 更新 table body
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  sortedItems.forEach(item => {
    const row = document.createElement("tr");
    
    const idCell = document.createElement("td");
    idCell.textContent = item.id;
    row.appendChild(idCell);

    const titleCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = item.link;
    link.target = "_blank";
    link.textContent = item.title;
    titleCell.appendChild(link);
    row.appendChild(titleCell);

    const difficultyCell = document.createElement("td");
    difficultyCell.textContent = item.difficulty;
    difficultyCell.className = `difficulty-${item.difficulty.toLowerCase()}`;
    row.appendChild(difficultyCell);

    const tagsCell = document.createElement("td");
    tagsCell.textContent = item.tags.join(", ");
    row.appendChild(tagsCell);

    tbody.appendChild(row);
  });
}

function renderRelations(nodeId) {
  const container = document.getElementById("nodeRelations");
  container.innerHTML = "";

  const relations = rawData.edges.filter(
    e => e.from === nodeId || e.to === nodeId
  );

  if (!relations.length) {
    container.innerHTML = "<li>無相關概念</li>";
    return;
  }

  relations.forEach(rel => {
    const otherId = rel.from === nodeId ? rel.to : rel.from;
    const otherNode = rawData.nodes.find(n => n.id === otherId);
    const li = document.createElement("li");
    li.innerHTML = `<strong>${otherNode?.label || otherId}</strong>（${rel.relation}）`;
    container.appendChild(li);
  });
}

function highlightConnected(nodeId) {
  const connectedNodeIds = new Set([nodeId]);

  rawData.edges.forEach(edge => {
    if (edge.from === nodeId) connectedNodeIds.add(edge.to);
    if (edge.to === nodeId) connectedNodeIds.add(edge.from);
  });

  const updatedNodes = nodesDataset.get().map(node => ({
    ...node,
    opacity: connectedNodeIds.has(node.id) ? 1 : 0.18
  }));

  const updatedEdges = edgesDataset.get().map(edge => ({
    ...edge,
    hidden: !(edge.from === nodeId || edge.to === nodeId)
  }));

  nodesDataset.update(updatedNodes);
  edgesDataset.update(updatedEdges);
}

function clearHighlight() {
  const updatedNodes = nodesDataset.get().map(node => ({
    ...node,
    opacity: 1
  }));

  const updatedEdges = edgesDataset.get().map(edge => ({
    ...edge,
    hidden: false
  }));

  nodesDataset.update(updatedNodes);
  edgesDataset.update(updatedEdges);
}

function clearInfoPanel() {
  document.getElementById("nodeTitle").textContent = "請點選一個節點";
  document.getElementById("nodeGroup").textContent = "-";
  document.getElementById("nodeDifficulty").textContent = "難度 -";
  document.getElementById("nodeLevel").textContent = "層級 -";
  document.getElementById("nodeDescription").textContent = "這裡會顯示節點說明、關鍵字、範例與相關概念。";
  document.getElementById("nodeKeywords").innerHTML = "";
  document.getElementById("nodeExamples").innerHTML = "";
  document.getElementById("nodeRelations").innerHTML = "";
}

function formatGroup(group) {
  const map = {
    root: "Root",
    category: "分類",
    concept: "概念",
    data_structure: "資料結構",
    strategy: "策略",
    algorithm: "演算法",
    technique: "技巧"
  };
  return map[group] || group;
}

function formatLevel(level) {
  const map = {
    beginner: "初學",
    intermediate: "中階",
    advanced: "進階",
    all: "全部"
  };
  return map[level] || level;
}

init();