// 高级光照计算核心脚本
// 功能: 楼栋绘制(选择/拖动)、单元划分、太阳位置近似、逐时间步射线遮挡判断
// 坐标: 画布顶部=北; x 向右=东, y 向下=南; 建筑 rotationDeg 为顺时针自北起角度
(function (global) {
  const AC = {};
  let canvas, ctx, placing = false;
  let buildings = [], nextId = 1;
  // scaleMetersPerCell: 每个正方形网格的边长(米)
  let scaleMetersPerCell = 10;
  // 网格行数固定 20 行(高度方向), 宽度方向按画布比例计算以保证单元正方形
  let gridRows = 20; // 高度上的格子数量
  let logicalHeight = gridRows; // 逻辑高度单位数 (=行数)
  let logicalWidth = 1; // 初始化后计算
  let cellPixelSize = 1; // 每个格子的像素尺寸 (正方形, CSS 像素)
  let cssW = 0, cssH = 0; // 当前 CSS 尺寸 (不含 DPR 放大)
  let hoverPt = null;
  let selectedId = null;
  let dragging = false; let dragOffset = {x:0,y:0};
  // 3D 视图相关
  let viewMode = '2d';
  let yaw = 0.6; // 水平旋转
  let pitch = 0.9; // 俯视角 (弧度, 0=水平, PI/2=正俯视)
  let scale3D = 30; // 3D缩放 (像素/逻辑单位)
  let rotating3D = false; let panning3D = false; let lastMouse = {x:0,y:0};
  let panX = 0, panY = 0; // 屏幕像素平移偏移
  let faceCache = []; // 当前 3D 帧面片缓存用于拾取
  // 扩展功能: 热力图/数据缓存
  let heatmapEnabled = false;
  let unitSunCache = null; // { buildingId: { floor: { unit: {spring,summer,autumn,winter,annual} } } }
  let lastCalcParams = null;

  function $(id) {
    return document.getElementById(id);
  }
  function computeGridMetrics(){
    logicalHeight = gridRows;
    // 使用 CSS 高度计算单元大小, 避免 DPR 影响
    cellPixelSize = cssH / logicalHeight;
    logicalWidth = cssW / cellPixelSize; // 保持正方形格子
  }
  function ratio(){ return cellPixelSize; }
  function logicalToCanvasX(v){ return v * ratio(); }
  function logicalToCanvasY(v){ return v * ratio(); }
  function metersToLogical(m) { return m / scaleMetersPerCell; }
  function logicalToMeters(l) { return l * scaleMetersPerCell; }

  AC.init = function(){ if(canvas && canvas._acBound) return; tryInit(0); };
  AC.componentRendered = function(){ AC.init(); };

  function tryInit(retry){
    canvas = $("ac-canvas");
    if(!canvas){ if(retry < 30) setTimeout(()=>tryInit(retry+1), 80); return; }
    ctx = canvas.getContext('2d'); if(canvas._acBound) return;
  readScale();
  resizeHiDPI();
    canvas.addEventListener('click', canvasClick);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('keydown', e=>{ if(e.key==='Escape') AC.cancelPlacement(); });
  window.addEventListener('resize', ()=>{ resizeHiDPI(); draw(); });
    canvas._acBound = true;
    bindButtons();
  draw();
  }

  function bindButtons(){
    const map = {
      'ac-btn-start': AC.startPlacement,
      'ac-btn-cancel': AC.cancelPlacement,
      'ac-btn-scale': AC.refreshScale,
      'ac-btn-calc': AC.calculateSunshine,
      'ac-target-building': AC.updateTargetFloors,
  'ac-btn-delete': AC.deleteSelected,
  'ac-btn-view2d': ()=>setViewMode('2d'),
  'ac-btn-view3d': ()=>setViewMode('3d')
    };
    Object.keys(map).forEach(id=>{
      const el = $(id); if(el && !el._acBound){ el.addEventListener('click', map[id]); el._acBound=true; }
    });
    // 下拉变化需用 change 事件
    const bSel = $("ac-target-building"); if(bSel && !bSel._acChange){ bSel.addEventListener('change', ()=>{ AC.updateTargetFloors(); AC.updateTargetUnits(); }); bSel._acChange=true; }
  const btnTable=$('ac-btn-all-table'); if(btnTable && !btnTable._ac){ btnTable.addEventListener('click', generateUnitTable); btnTable._ac=true; }
  const btnExportCsv=$('ac-btn-export-csv'); if(btnExportCsv && !btnExportCsv._ac){ btnExportCsv.addEventListener('click', exportAllCsv); btnExportCsv._ac=true; }
  const btnExportB=$('ac-btn-export-buildings'); if(btnExportB && !btnExportB._ac){ btnExportB.addEventListener('click', exportBuildingsJson); btnExportB._ac=true; }
  const btnImportB=$('ac-btn-import-buildings'); if(btnImportB && !btnImportB._ac){ btnImportB.addEventListener('click', ()=>{ const f=$('ac-file-import'); if(f) f.click(); }); btnImportB._ac=true; }
  const fileImport=$('ac-file-import'); if(fileImport && !fileImport._ac){ fileImport.addEventListener('change', importBuildingsJson); fileImport._ac=true; }
  const btnHeat=$('ac-btn-heatmap'); if(btnHeat && !btnHeat._ac){ btnHeat.addEventListener('click', ()=>{ heatmapEnabled=!heatmapEnabled; btnHeat.textContent=heatmapEnabled?'热力图ON':'热力图OFF'; if(heatmapEnabled && !unitSunCache){ setStatus('需先生成单元日照表'); heatmapEnabled=false; btnHeat.textContent='热力图OFF'; } draw(); }); btnHeat._ac=true; }
  }
  function setViewMode(m){
    if(viewMode===m) return;
    viewMode = m;
    if(viewMode==='3d'){ // 初始化 3D 缩放使场景大致适配
      scale3D = Math.min(cssW, cssH) / (gridRows*0.7);
    }
    updateViewButtons();
    draw();
  }
  function updateViewButtons(){
    const b2=$('ac-btn-view2d'), b3=$('ac-btn-view3d');
    if(b2) b2.classList.toggle('ac-active', viewMode==='2d');
    if(b3) b3.classList.toggle('ac-active', viewMode==='3d');
  }

  function setStatus(msg) {
    const el = $("ac-status");
    if (el) el.textContent = msg;
  }
  function getLowAltThreshold(){ const v=parseFloat(($("ac-low-alt-threshold")||{}).value); return isFinite(v)? v : 2; }

  function readScale() {
    const v = parseFloat(($("ac-scale") || {}).value);
    if(isFinite(v) && v>0) scaleMetersPerCell = v;
  }
  AC.refreshScale = function () {
    readScale();
    draw();
  };

  function collectPending() {
    return {
      id: 0,
  width: metersToLogical(val("ac-b-width", 100)),
  length: metersToLogical(val("ac-b-length", 10)),
      height: val("ac-b-height", 60),
      floorHeight: val("ac-b-floorHeight", 3),
  units: val("ac-b-units", 1),
      rotationDeg: val("ac-b-rotation", 0),
      x: 0,
      y: 0,
    };
  }
  function val(id, def) {
    const el = $(id);
    const v = parseFloat(el && el.value);
    return isNaN(v) ? def : v;
  }

  AC.startPlacement = function () { placing = true; setStatus("放置模式: 在画布点击确定位置, ESC 取消"); };
  AC.cancelPlacement = function () {
    placing = false;
    setStatus("已取消放置");
    draw();
  };

  function canvasClick(e){
    const p = getLogical(e);
    if(viewMode==='2d'){
      if(placing){ placeNew(p); return; }
      const b = hitTest(p); if(b){ selectBuilding(b.id); }
    } else if(viewMode==='3d') {
  // 确保最新面片
  draw();
  pick3D(e);
    }
  }

  function placeNew(p){
    const b = collectPending();
    if (!isFinite(b.width) || !isFinite(b.length) || b.width<=0 || b.length<=0) { setStatus('楼栋尺寸无效'); return; }
    b.id = nextId++;
    b.x = p.x; b.y = p.y;
    buildings.push(b); placing=false; selectedId = b.id;
    setStatus("已添加楼栋 #" + b.id);
    updateBuildingList(); updateTargetBuildingSelect(); draw();
  }

  function onDown(e){
    if(viewMode==='3d'){
      if(e.button === 1){ // 中键平移
        panning3D = true; lastMouse.x = e.clientX; lastMouse.y = e.clientY; e.preventDefault(); return; }
      if(e.button === 0){ // 左键旋转
        rotating3D = true; lastMouse.x = e.clientX; lastMouse.y = e.clientY; e.preventDefault(); return; }
    }
    if(placing) return; // placement uses click only
    const p = getLogical(e);
    const b = hitTest(p);
    if(b){ selectBuilding(b.id); dragging = true; dragOffset.x = b.x - p.x; dragOffset.y = b.y - p.y; e.preventDefault(); }
  }

  function onUp(){ dragging = false; rotating3D=false; panning3D=false; }

  function onMove(e) {
    if(viewMode==='3d'){
      const dx = e.clientX - lastMouse.x; const dy = e.clientY - lastMouse.y;
      if(rotating3D){
        yaw += dx * 0.01; pitch += dy * 0.01; pitch = Math.min(1.45, Math.max(0.2, pitch));
        lastMouse.x = e.clientX; lastMouse.y = e.clientY; draw(); return; }
      if(panning3D){
        panX += dx; panY += dy; lastMouse.x = e.clientX; lastMouse.y = e.clientY; draw(); return; }
      return;
    }
    hoverPt = getLogical(e); showCoord(hoverPt); draw();
    if (placing) { const b = collectPending(); b.x = hoverPt.x; b.y = hoverPt.y; drawBuilding(b, true); }
    else if(dragging && selectedId!=null){ const sel = buildings.find(x=>x.id===selectedId); if(sel){ sel.x = hoverPt.x + dragOffset.x; sel.y = hoverPt.y + dragOffset.y; draw(); } }
  }
  function showCoord(p) {
    const el = $("ac-coord");
    if (el)
      el.textContent = `X:${logicalToMeters(p.x).toFixed(
        1
      )}m Y:${logicalToMeters(p.y).toFixed(1)}m`;
  }
  function getLogical(e) {
    const r = canvas.getBoundingClientRect();
    const relX = e.clientX - r.left;
    const relY = e.clientY - r.top;
    return {
      x: relX / cellPixelSize,
      y: relY / cellPixelSize,
    };
  }

  function updateBuildingList() {
    const list = $("ac-building-list");
    list.innerHTML = "";
    buildings.forEach((b) => {
      const floors = Math.floor(b.height / b.floorHeight);
      const d = document.createElement("div");
  d.textContent = `#${b.id} W:${logicalToMeters(b.width).toFixed(1)} L:${logicalToMeters(b.length).toFixed(1)} H:${b.height} 层:${floors}`;
  d.dataset.id = b.id;
  if(b.id===selectedId) d.classList.add('ac-selected');
  d.style.cursor='pointer';
  d.onclick = ()=>{ selectBuilding(b.id); };
      list.appendChild(d);
    });
  }
  function updateTargetBuildingSelect() {
    const sel = $("ac-target-building");
    sel.innerHTML = "";
    buildings.forEach((b) => {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = "#" + b.id;
      sel.appendChild(o);
    });
    AC.updateTargetFloors();
  if(AC.updateTargetUnits) AC.updateTargetUnits();
  }
  AC.updateTargetFloors = function () {
    const sel = $("ac-target-building");
    const b = buildings.find((x) => x.id == sel.value);
    const fsel = $("ac-target-floor");
    fsel.innerHTML = "";
    if (!b) return;
    const floors = Math.floor(b.height / b.floorHeight);
    for (let i = 1; i <= floors; i++) {
      const o = document.createElement("option");
      o.value = i;
      o.textContent = i;
      fsel.appendChild(o);
    }
  };
  AC.updateTargetUnits = function(){
    const sel = $("ac-target-building");
    const b = buildings.find((x) => x.id == sel.value);
    let unitSel = $("ac-target-unit");
    if(!unitSel){
      const fsel = $("ac-target-floor");
      if(fsel && fsel.parentElement){
        const lbl = document.createElement('span'); lbl.textContent=' 单元:'; lbl.style.fontSize='0.7rem';
        unitSel = document.createElement('select'); unitSel.id='ac-target-unit'; unitSel.style.fontSize='0.7rem'; unitSel.style.marginLeft='2px';
        fsel.parentElement.appendChild(lbl); fsel.parentElement.appendChild(unitSel);
      }
    }
    if(!unitSel) return;
    unitSel.innerHTML='';
    if(!b) return;
    const u = Math.max(1, Math.round(b.units||1));
    for(let i=1;i<=u;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; unitSel.appendChild(o);}    
  };

  function draw() {
    if (!ctx) return;
    resizeHiDPI(); // 同步尺寸 & 计算网格
    ctx.clearRect(0, 0, cssW, cssH);
    if(viewMode==='2d'){
      drawGrid();
      buildings.forEach((b) => drawBuilding(b, false));
      if(placing && hoverPt){ ctx.save(); ctx.strokeStyle = '#f55'; ctx.lineWidth=1; const cx = logicalToCanvasX(hoverPt.x), cy = logicalToCanvasY(hoverPt.y); ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.lineTo(cx+10, cy); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, cy-10); ctx.lineTo(cx, cy+10); ctx.stroke(); ctx.restore(); }
    } else {
      draw3DScene();
    }
  }
  function drawGrid() {
    ctx.save();
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    const rows = logicalHeight; const cols = logicalWidth; // cols 可能是小数
    // 竖线: 0..floor(cols) 以及最右边一条
    for(let c=0;c<=Math.floor(cols);c++){
      const x = logicalToCanvasX(c);
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x, cssH); ctx.stroke();
    }
    // 如果有剩余部分(非整数列)画最右边边界
    const rightX = logicalToCanvasX(cols);
    if(Math.abs(rightX - cssW) > 0.5){
      ctx.beginPath(); ctx.moveTo(cssW-0.5,0); ctx.lineTo(cssW-0.5, cssH); ctx.stroke();
    } else if(Math.floor(cols)!==cols) {
      ctx.beginPath(); ctx.moveTo(rightX,0); ctx.lineTo(rightX, cssH); ctx.stroke();
    }
    // 横线: 0..rows
    for(let rIdx=0;rIdx<=rows;rIdx++){
      const y = logicalToCanvasY(rIdx);
      ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cssW, y); ctx.stroke();
    }
    ctx.fillStyle = "#333";
    ctx.font = "14px sans-serif";
    ctx.fillText("北", cssW / 2 - 10, 14);
    ctx.restore();
  }
  function drawBuilding(b, preview) {
    ctx.save();
    const cx = logicalToCanvasX(b.x),
      cy = logicalToCanvasY(b.y);
    const w = logicalToCanvasX(b.width),
      l = logicalToCanvasY(b.length);
    ctx.translate(cx, cy);
    ctx.rotate((b.rotationDeg * Math.PI) / 180);
    const isSel = b.id===selectedId;
    ctx.strokeStyle = preview ? "#55f" : (isSel?"#d22":"#333");
    ctx.fillStyle = preview ? "rgba(80,80,255,0.15)" : (isSel?"rgba(255,120,120,0.18)":"rgba(0,0,0,0.08)");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-w / 2, -l / 2, w, l);
    ctx.fill();
    ctx.stroke();
    // 单元分隔线 (沿宽方向)
    const units = Math.max(1, Math.round(b.units||1));
    if(units>1){
      ctx.save();
      ctx.strokeStyle = preview? '#88a' : '#666';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,3]);
      for(let i=1;i<units;i++){
        const x = -w/2 + w/units * i;
        ctx.beginPath();
        ctx.moveTo(x, -l/2);
        ctx.lineTo(x, l/2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if(isSel){
      ctx.lineWidth = 1;
      ctx.setLineDash([4,3]);
      ctx.strokeStyle = '#d22';
      ctx.strokeRect(-w/2, -l/2, w, l);
      ctx.setLineDash([]);
    }
    // 文本信息
    const floors = Math.max(1, Math.floor(b.height / (b.floorHeight||3)));
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
  // 放大字号以适配更大画布: 原 w/12 改为 w/9, 上限 18
  const fontBase = Math.min(Math.max(10, w/9), 18);
    ctx.font = fontBase + "px monospace";
  const line1 = `W:${logicalToMeters(b.width).toFixed(1)} L:${logicalToMeters(b.length).toFixed(1)}`;
    const line2 = `H:${b.height} 层:${floors} 单元:${units}`;
    // 尽量放在内部, 若长度太小则放在外部上方
    const inside = l > (fontBase*3.2);
    if(inside){
      ctx.fillText(line1, 0, -fontBase*0.4);
      ctx.fillText(line2, 0, fontBase*1.1);
    } else {
      ctx.fillText(line1 + ' ' + line2, 0, -l/2 - 4);
    }
    // 在顶边再标注总宽度(米)
    ctx.font = (fontBase-1) + 'px monospace';
  ctx.fillText(logicalToMeters(b.width).toFixed(1)+'m', 0, -l/2 - 4 - fontBase);
    ctx.restore();
  }

  function hitTest(p){
    // iterate from top (last) to first
    for(let i=buildings.length-1;i>=0;i--){
      const b = buildings[i];
      if(pointInBuilding(p, b)) return b;
    }
    return null;
  }

  function pointInBuilding(p,b){
    const rad = -b.rotationDeg * Math.PI/180; // inverse rotate
    const dx = p.x - b.x; const dy = p.y - b.y;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    return Math.abs(rx) <= b.width/2 && Math.abs(ry) <= b.length/2;
  }

  //================= HiDPI 处理 =================
  function resizeHiDPI(){
    if(!canvas) return;
    const rect = canvas.getBoundingClientRect();
    cssW = rect.width; cssH = rect.height;
    const dpr = window.devicePixelRatio || 1;
    const need = canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr);
    if(need){
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      if(ctx){ ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr,dpr); }
    }
    computeGridMetrics();
    if(viewMode==='3d' && scale3D===30){ scale3D = Math.min(cssW, cssH)/(gridRows*0.7); }
  }

  //================= 3D 绘制与交互 =================
  function draw3DScene(){
    // 背景网格(简单平面)
    ctx.save();
    ctx.fillStyle = '#fafafa'; ctx.fillRect(0,0,cssW,cssH);
    ctx.strokeStyle='#eee'; ctx.lineWidth=1;
    const centerX = cssW/2, centerY = cssH/2;
    const extent = gridRows; // 仅绘制部分
    for(let g=-extent; g<=extent; g++){
      const p1 = project3D(g, -extent, 0, centerX, centerY);
      const p2 = project3D(g, extent, 0, centerX, centerY);
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
      const q1 = project3D(-extent, g, 0, centerX, centerY);
      const q2 = project3D(extent, g, 0, centerX, centerY);
      ctx.beginPath(); ctx.moveTo(q1.x,q1.y); ctx.lineTo(q2.x,q2.y); ctx.stroke();
    }
    // 绘制楼栋
    faceCache = [];
    buildings.forEach(b=> drawBuilding3D(b, centerX, centerY));
    // 绘制已排序后的面片
    faceCache.sort((a,b)=> a.depth - b.depth);
    // 热力数据范围
    let heatRange=null; if(heatmapEnabled && unitSunCache){ let minA=Infinity,maxA=-Infinity; Object.keys(unitSunCache).forEach(bid=>{ const floors=unitSunCache[bid]; Object.keys(floors).forEach(fl=>{ Object.values(floors[fl]).forEach(rec=>{ if(rec.annual!=null){ if(rec.annual<minA) minA=rec.annual; if(rec.annual>maxA) maxA=rec.annual; } }); }); }); if(minA<Infinity) heatRange={min:minA,max:maxA}; }
    faceCache.forEach(f=>{
      ctx.beginPath();
      f.screen.forEach((pt,i)=>{ if(i===0) ctx.moveTo(pt.x,pt.y); else ctx.lineTo(pt.x,pt.y); });
      ctx.closePath();
      if(f.kind==='top'){
        if(heatRange){
          const b=f.building; const units=Math.max(1,Math.round(b.units||1));
          const p0=f.screen[0],p1=f.screen[1],p2=f.screen[2],p3=f.screen[3];
          for(let u=0;u<units;u++){
            const f0=u/units,f1=(u+1)/units;
            const a0=lerpPoint(p0,p1,f0), a1=lerpPoint(p0,p1,f1);
            const b0=lerpPoint(p3,p2,f0), b1=lerpPoint(p3,p2,f1);
            ctx.beginPath(); ctx.moveTo(a0.x,a0.y); ctx.lineTo(a1.x,a1.y); ctx.lineTo(b1.x,b1.y); ctx.lineTo(b0.x,b0.y); ctx.closePath();
            ctx.fillStyle = heatColorFor(b,1,u+1,heatRange); ctx.fill();
          }
          ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.stroke();
          return;
        } else {
          ctx.fillStyle = f.building.id===selectedId? 'rgba(255,120,120,0.35)':'rgba(0,0,0,0.15)';
        }
      } else {
        // 剖切: 选中楼栋使其侧面更透明
        const alpha = f.building.id===selectedId?0.15:0.08;
        ctx.fillStyle = 'rgba(0,0,0,'+alpha+')';
      }
      ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth=1; ctx.stroke();
      // 单元/楼层分隔 (仅在顶面或宽向侧面上绘制虚线辅助)
      if(f.kind==='top'){
        const b = f.building; const units = Math.max(1, Math.round(b.units||1));
        if(units>1){
          for(let u=1;u<units;u++){
            const frac = u/units;
            const a = lerpPoint(f.screen[0], f.screen[1], frac);
            const bpt = lerpPoint(f.screen[3], f.screen[2], frac);
            ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(bpt.x,bpt.y); ctx.stroke(); ctx.setLineDash([]);
          }
        }
  // 顶面不再单独渲染单元高亮, 改为后面针对指定楼层+单元整体体素渲染
      } else if(f.kind==='side'){
        // 楼层网格线 (侧面)
        const b = f.building; const floors = Math.max(1, Math.floor(b.height / b.floorHeight));
        if(floors>1){
          for(let fl=1; fl<floors; fl++){
            const fracH = fl / floors; // 0 底 -> 1 顶
            const leftEdgeBottom = f.screen[0];
            const leftEdgeTop = f.screen[3];
            const rightEdgeBottom = f.screen[1];
            const rightEdgeTop = f.screen[2];
            const leftPoint = lerpPoint(leftEdgeBottom, leftEdgeTop, fracH);
            const rightPoint = lerpPoint(rightEdgeBottom, rightEdgeTop, fracH);
            ctx.setLineDash([3,3]); ctx.strokeStyle = '#777'; ctx.beginPath(); ctx.moveTo(leftPoint.x,leftPoint.y); ctx.lineTo(rightPoint.x,rightPoint.y); ctx.stroke(); ctx.setLineDash([]);
          }
        }
      }
    });
  // 选中单元所在楼层的三维高亮体
  drawSelectedUnitFloorVolume();
  // 顶部标签
    faceCache.filter(f=>f.kind==='top').forEach(f=>{
      const b = f.building; const center = centroid(f.screen);
      ctx.fillStyle='#000'; ctx.font='12px monospace'; ctx.textAlign='center';
      ctx.fillText('#'+b.id, center.x, center.y-4);
    });
    ctx.restore();
  }
  function project3D(wx, wy, wz, cx, cy){
    // 逻辑单位 -> 屏幕 (正交)
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
    const x1 = wx*cyaw - wy*syaw;
    const y1 = wx*syaw + wy*cyaw;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const y2 = y1*cp - wz*sp; // 俯视压缩高度
  const xScreen = x1 * scale3D + cx + panX;
  const yScreen = y2 * scale3D + cy + panY;
    return {x:xScreen, y:yScreen, depth: y1*sp + wz*cp};
  }
  function drawBuilding3D(b, cx, cy){
    const w = b.width; const l = b.length; const h = b.height / scaleMetersPerCell;
    const ang = b.rotationDeg * Math.PI/180; const ca=Math.cos(ang), sa=Math.sin(ang);
    function local(dx,dy){ return { x: b.x + dx*ca - dy*sa, y: b.y + dx*sa + dy*ca }; }
    const g = [ local(-w/2,-l/2), local(w/2,-l/2), local(w/2,l/2), local(-w/2,l/2) ];
    const t = g.map(v=> ({x:v.x,y:v.y,z:h}));
    const polys = [
      {kind:'top', verts:t, id:'top'},
      {kind:'side', verts:[g[0],g[1],{...t[1]},{...t[0]}], id:'side0', horiz:'width'},
      {kind:'side', verts:[g[1],g[2],{...t[2]},{...t[1]}], id:'side1', horiz:'length'},
      {kind:'side', verts:[g[2],g[3],{...t[3]},{...t[2]}], id:'side2', horiz:'width'},
      {kind:'side', verts:[g[3],g[0],{...t[0]},{...t[3]}], id:'side3', horiz:'length'}
    ];
    polys.forEach(face=>{
      const scr = face.verts.map(p=> project3D(p.x,p.y,p.z||0,cx,cy));
      const depth = scr.reduce((s,v)=>s+v.depth,0)/scr.length;
      faceCache.push({building:b, kind:face.kind, id:face.id, horiz:face.horiz, screen:scr.map(p=>({x:p.x,y:p.y})), depth, w,l,h});
    });
  }
  function lerpPoint(a,b,t){ return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t}; }
  function centroid(points){ let x=0,y=0; points.forEach(p=>{x+=p.x;y+=p.y;}); return {x:x/points.length,y:y/points.length}; }
  function pointInPoly(x,y,poly){ let inside=false; for(let i=0,j=poly.length-1;i<poly.length;j=i++){
      const xi=poly[i].x, yi=poly[i].y, xj=poly[j].x, yj=poly[j].y;
      const intersect = ((yi>y)!=(yj>y)) && (x < (xj - xi)*(y - yi)/(yj - yi + 1e-9) + xi);
      if(intersect) inside=!inside; }
    return inside; }
  function pick3D(e){
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left; const sy = e.clientY - rect.top;
    // 面片按绘制顺序逆序遍历 (近的在后)
    for(let i=faceCache.length-1;i>=0;i--){
      const f = faceCache[i];
      if(!pointInPoly(sx,sy,f.screen)) continue;
      const b = f.building; selectBuilding(b.id);
      let unitIdx = (function(){ const sel=$('ac-target-unit'); return sel?parseInt(sel.value)||1:1; })();
      let floorIdx = (function(){ const sel=$('ac-target-floor'); return sel?parseInt(sel.value)||1:1; })();
      const units = Math.max(1, Math.round(b.units||1));
      const floors = Math.max(1, Math.floor(b.height / b.floorHeight));
      const poly = f.screen;
      const minX = Math.min(...poly.map(p=>p.x)); const maxX = Math.max(...poly.map(p=>p.x));
      const minY = Math.min(...poly.map(p=>p.y)); const maxY = Math.max(...poly.map(p=>p.y));
      if(f.kind==='top'){
        // 单元: 顶面水平方向 (大致)
        if(units>1 && maxX-minX>2){
          const frac = (sx - minX)/(maxX-minX);
          unitIdx = Math.min(units, Math.max(1, Math.floor(frac*units)+1));
        }
      } else if(f.kind==='side') {
        // 楼层: 垂直分割
        if(floors>1 && maxY-minY>2){
          const fracY = (sy - minY)/(maxY - minY); // 0 底部 1 顶部 (y 增大向下, 所以 floor 反向)
          const inv = 1 - fracY;
          floorIdx = Math.min(floors, Math.max(1, Math.floor(inv*floors)+1));
        }
        // 单元: 仅在宽向侧面 (side0 / side2) 使用水平
        if((f.id==='side0' || f.id==='side2') && units>1 && maxX-minX>2){
          const fracX = (sx - minX)/(maxX - minX);
          unitIdx = Math.min(units, Math.max(1, Math.floor(fracX*units)+1));
        }
      }
      const unitSelEl = $('ac-target-unit'); if(unitSelEl) unitSelEl.value = unitIdx;
      const floorSelEl = $('ac-target-floor'); if(floorSelEl) floorSelEl.value = floorIdx;
      setStatus('选择: #'+b.id+' 楼层 '+floorIdx+' 单元 '+unitIdx);
      draw();
      return;
    }
  }

  function drawSelectedUnitFloorVolume(){
    if(!selectedId) return;
    const b = buildings.find(x=>x.id===selectedId); if(!b) return;
    const unitSelEl = $('ac-target-unit'); const floorSelEl = $('ac-target-floor');
    let unitIdx = unitSelEl? parseInt(unitSelEl.value)||1 : 1;
    let floorIdx = floorSelEl? parseInt(floorSelEl.value)||1 : 1;
    const units = Math.max(1, Math.round(b.units||1)); unitIdx = Math.min(units, Math.max(1, unitIdx));
    const floors = Math.max(1, Math.floor(b.height / b.floorHeight)); floorIdx = Math.min(floors, Math.max(1, floorIdx));
    const w = b.width, l = b.length; const ang = b.rotationDeg*Math.PI/180; const ca=Math.cos(ang), sa=Math.sin(ang);
    function local(dx,dy){ return { x: b.x + dx*ca - dy*sa, y: b.y + dx*sa + dy*ca }; }
    const unitW = w / units;
    const ux0 = -w/2 + unitW * (unitIdx-1);
    const ux1 = ux0 + unitW;
    const ly0 = -l/2; const ly1 = l/2;
    const floorBottomMeters = (floorIdx-1)*b.floorHeight;
    const floorTopMeters = floorIdx * b.floorHeight;
    const z0 = floorBottomMeters / scaleMetersPerCell;
    const z1 = floorTopMeters / scaleMetersPerCell;
    const cornersBottom = [ local(ux0,ly0), local(ux1,ly0), local(ux1,ly1), local(ux0,ly1) ].map(p=>({x:p.x,y:p.y,z:z0}));
    const cornersTop    = [ local(ux0,ly0), local(ux1,ly0), local(ux1,ly1), local(ux0,ly1) ].map(p=>({x:p.x,y:p.y,z:z1}));
    const centerX = cssW/2, centerY=cssH/2;
    function face(list){
      const scr = list.map(v=> project3D(v.x,v.y,v.z,centerX,centerY));
      ctx.beginPath(); scr.forEach((pt,i)=>{ if(i===0) ctx.moveTo(pt.x,pt.y); else ctx.lineTo(pt.x,pt.y); }); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.save();
    ctx.fillStyle='rgba(255,230,80,0.55)'; ctx.strokeStyle='#d4a400'; ctx.lineWidth=1;
    // 顶面 & 底面 & 四侧, 简化画顺序即可
    face(cornersTop);
    // 侧面四个
    for(let i=0;i<4;i++){
      const a0 = cornersBottom[i]; const a1 = cornersBottom[(i+1)%4];
      const b0 = cornersTop[i];    const b1 = cornersTop[(i+1)%4];
      face([a0,a1,b1,b0]);
    }
    ctx.restore();
  }

  // 鼠标滚轮控制 3D 缩放
  canvas?.addEventListener && canvas.addEventListener('wheel', (ev)=>{ if(viewMode!=='3d') return; ev.preventDefault(); const f = ev.deltaY<0?1.15:1/1.15; scale3D = Math.min(400, Math.max(5, scale3D*f)); draw(); }, {passive:false});
  function heatColorFor(b,floorIdx,unitIdx,range){
    const rec = unitSunCache && unitSunCache[b.id] && unitSunCache[b.id][floorIdx] && unitSunCache[b.id][floorIdx][unitIdx];
    if(!rec) return 'rgba(0,0,0,0.15)';
    const t=(rec.annual - range.min)/Math.max(1e-6,(range.max-range.min));
    function mix(a,b,t){ return a+(b-a)*t; }
    let r,g,bl; if(t<0.5){ const tt=t/0.5; r=mix(0,255,tt); g=mix(80,255,tt); bl=mix(255,0,tt); } else { const tt=(t-0.5)/0.5; r=255; g=mix(255,0,tt); bl=0; }
    return `rgba(${r|0},${g|0},${bl|0},0.65)`;
  }

  function selectBuilding(id){
    selectedId = id; dragging=false; updateBuildingList(); updateTargetBuildingSelect(); draw();
  }

  AC.deleteSelected = function(){
    if(selectedId==null) { setStatus('未选择楼栋'); return; }
    buildings = buildings.filter(b=>b.id!==selectedId);
    setStatus('已删除楼栋 #' + selectedId);
    selectedId = null; updateBuildingList(); updateTargetBuildingSelect(); draw();
  };

  //================= 太阳位置与遮挡 (近似模型) =================
  function solarDeclination(dayOfYear){
    return 0.006918 - 0.399912*Math.cos(2*Math.PI/365*(dayOfYear-1)) + 0.070257*Math.sin(2*Math.PI/365*(dayOfYear-1))
    -0.006758*Math.cos(4*Math.PI/365*(dayOfYear-1)) + 0.000907*Math.sin(4*Math.PI/365*(dayOfYear-1))
    -0.002697*Math.cos(6*Math.PI/365*(dayOfYear-1)) + 0.00148*Math.sin(6*Math.PI/365*(dayOfYear-1));
  }
  function equationOfTime(dayOfYear){
    const B = 2*Math.PI/364*(dayOfYear-81);
    return 9.87*Math.sin(2*B) - 7.53*Math.cos(B) - 1.5*Math.sin(B); // 分钟
  }
  function dayLengthHours(latDeg, dayOfYear){
    const lat = latDeg*Math.PI/180; const decl = solarDeclination(dayOfYear);
    const ha = Math.acos(Math.min(1,Math.max(-1,-Math.tan(lat)*Math.tan(decl))));
    return 2*ha*180/Math.PI/15;
  }
  function solarPosition(latDeg, lonDeg, dayOfYear, minutes, tzHour){
    // 改为基于当地标准时: tzHour≈四舍五入(lon/15)
    // local clock hour
    const localHour = minutes/60; // 0-24
    const E = equationOfTime(dayOfYear); // 分钟
    const lstm = tzHour * 15; // 标准经线
    const tc = E + 4*(lonDeg - lstm); // 时间校正 (分钟)
    const solarTime = localHour + tc/60; // 太阳时 (小时)
    const haDeg = (solarTime - 12)*15; // 时角
    const ha = haDeg*Math.PI/180;
    const decl = solarDeclination(dayOfYear);
    const lat = latDeg*Math.PI/180;
    const cosZen = Math.sin(lat)*Math.sin(decl) + Math.cos(lat)*Math.cos(decl)*Math.cos(ha);
    const zen = Math.acos(Math.min(1,Math.max(-1,cosZen)));
    const altDeg = 90 - zen*180/Math.PI;
    // 方位角: 使用常规公式, 输出从北顺时针
    let az = Math.atan2(Math.sin(ha), Math.cos(ha)*Math.sin(lat) - Math.tan(decl)*Math.cos(lat));
    az = az*180/Math.PI; // -180..180 (南基准)
    az = (az + 180 + 360) % 360; // 旋转到北基准顺时针
    return { altitude: altDeg, azimuth: az };
  }
  function equinoxDay(which){ return which==='spring'?79:266; }
  function solsticeDay(which){ return which==='summer'?172:355; }
  function computeDaySunMinutes(lat, lon, dayOfYear, target, pointZ, stepMin, tz, unitPt){
    const dl = dayLengthHours(lat, dayOfYear);
    const mid = 12; const span = dl/2 + 1; // 额外1小时缓冲
    const start = Math.max(0, (mid-span)*60); const end = Math.min(24*60, (mid+span)*60);
    let lit = 0;
    for(let m=start; m<=end; m+=stepMin){
      const sp = solarPosition(lat, lon, dayOfYear, m, tz);
      if(sp.altitude <= 0) continue;
  if(sp.altitude < getLowAltThreshold()) continue; // 低高度剔除(可调)
      if(!isBlocked(sp, target, pointZ, unitPt)) lit += stepMin;
    }
    return lit;
  }
  function isBlocked(sp, target, pointZ, unitPt){
    const altRad = sp.altitude*Math.PI/180; if(altRad <= 0) return true;
    const azRad = sp.azimuth*Math.PI/180;
    // 约定: 画布 y 向下=南, x 向右=东, 北=负y
    const dirX = Math.sin(azRad) * Math.cos(altRad);
    const dirY = -Math.cos(azRad) * Math.cos(altRad); // 北正 -> 逻辑坐标负
    const dirZ = Math.sin(altRad);
    const origin = { x: unitPt?unitPt.x:target.x, y: unitPt?unitPt.y:target.y, z: pointZ };
    for(const b of buildings){ if(b===target) continue; if(rayHitBox(origin, {x:dirX,y:dirY,z:dirZ}, b)) return true; }
    return false;
  }
  function rayHitBox(o,d,b){
    // 旋转到本地坐标
    const ang = -b.rotationDeg*Math.PI/180; const cosA=Math.cos(ang), sinA=Math.sin(ang);
    function toLocalX(x,y){ return (x-b.x)*cosA - (y-b.y)*sinA; }
    function toLocalY(x,y){ return (x-b.x)*sinA + (y-b.y)*cosA; }
    const ox = toLocalX(o.x,o.y), oy = toLocalY(o.x,o.y), oz=o.z;
    const dx = d.x*cosA - d.y*sinA, dy = d.x*sinA + d.y*cosA, dz=d.z;
    const hx=b.width/2, hy=b.length/2, hz=b.height;
    const tx1 = (-hx-ox)/dx, tx2=(hx-ox)/dx;
    const ty1 = (-hy-oy)/dy, ty2=(hy-oy)/dy;
    let tmin = Math.max(Math.min(tx1,tx2), Math.min(ty1,ty2));
    let tmax = Math.min(Math.max(tx1,tx2), Math.max(ty1,ty2));
    if(tmax < 0 || tmin > tmax) return false;
    const tz1 = (0-oz)/dz, tz2=(hz-oz)/dz;
    tmin = Math.max(tmin, Math.min(tz1,tz2));
    tmax = Math.min(tmax, Math.max(tz1,tz2));
    if(tmax < 0 || tmin > tmax) return false;
    return tmax>0; // 有交点
  }

  AC.calculateSunshine = function(){
    const lat = parseFloat(($("ac-lat")||{}).value);
    const lon = parseFloat(($("ac-lon")||{}).value);
    if(!isFinite(lat)||!isFinite(lon)){ setStatus('经纬度无效'); return; }
    const target = buildings.find(x=> x.id == $("ac-target-building").value);
    if(!target){ $("ac-result").textContent='请选择楼栋'; return; }
    const floorIndex = parseInt(($("ac-target-floor")||{}).value) || 1;
    const unitIndex = parseInt(($("ac-target-unit")||{}).value) || 1;
    const pointZ = (floorIndex-0.5)* target.floorHeight; // 层中心高度
    const step = 5; // 分钟步长
    const tz = Math.round(lon/15); // 简易时区推断
    const days = [
      { name:'春分', day: equinoxDay('spring') },
      { name:'夏至', day: solsticeDay('summer') },
      { name:'秋分', day: equinoxDay('autumn') },
      { name:'冬至', day: solsticeDay('winter') }
    ];
    const unitPt = unitCenterPoint(target, unitIndex);
  let out = `真实遮挡近似 (步长${step}分钟)\n目标:#${target.id} 第${floorIndex}层 单元${unitIndex}/${target.units||1} 高≈${pointZ.toFixed(2)}m 时区≈UTC+${tz} 低高度阈值:${getLowAltThreshold()}°\n`;
    days.forEach(d=>{
      const dlTheo = dayLengthHours(lat, d.day);
      const minutes = computeDaySunMinutes(lat, lon, d.day, target, pointZ, step, tz, unitPt);
      out += `${d.name}: 日长≈${dlTheo.toFixed(2)}h 实得${(minutes/60).toFixed(2)}h\n`;
    });
    // 年度粗估: 取每月中旬 (近似日序)
    const samples = [15,46,74,105,135,166,196,227,258,288,319,349];
    let acc=0; samples.forEach(sd=> acc+= computeDaySunMinutes(lat, lon, sd, target, pointZ, step, tz, unitPt));
    out += `年度平均(12样本): ${(acc/samples.length/60).toFixed(2)} h/日\n`;
    out += `假设: 1) 建筑为不透光长方体 2) 地表平坦无反射 3) 未考虑大气折射/散射 4) 步长可调权衡精度性能。`;
  $("ac-result").textContent = out; lastCalcParams={lat,lon,step,tz,threshold:getLowAltThreshold()};
  };
  function unitCenterPoint(b, unitIndex){
    const units = Math.max(1, Math.round(b.units||1));
    const frac = (unitIndex-0.5)/units;
    const localX = (frac - 0.5) * b.width;
    const localY = 0;
    const ang = b.rotationDeg*Math.PI/180;
    return { x: b.x + localX*Math.cos(ang) - localY*Math.sin(ang), y: b.y + localX*Math.sin(ang) + localY*Math.cos(ang) };
  }

  // 结束
  function ensureUnitSunCache(lat, lon){
    unitSunCache={}; const step=10; const tz=Math.round(lon/15);
    const days={spring:equinoxDay('spring'),summer:solsticeDay('summer'),autumn:equinoxDay('autumn'),winter:solsticeDay('winter')};
    buildings.forEach(b=>{ const floors=Math.max(1,Math.floor(b.height / b.floorHeight)); const units=Math.max(1,Math.round(b.units||1)); unitSunCache[b.id]={}; for(let fl=1; fl<=floors; fl++){ unitSunCache[b.id][fl]={}; const pointZ=(fl-0.5)*b.floorHeight; for(let u=1; u<=units; u++){ const pt=unitCenterPoint(b,u); const rec={}; Object.keys(days).forEach(k=>{ rec[k]=computeDaySunMinutes(lat,lon,days[k],b,pointZ,step, tz, pt)/60; }); const samples=[15,46,74,105,135,166,196,227,258,288,319,349]; let acc=0; samples.forEach(sd=> acc+= computeDaySunMinutes(lat,lon,sd,b,pointZ,step,tz,pt)); rec.annual=acc/samples.length/60; unitSunCache[b.id][fl][u]=rec; } } });
  }
  function generateUnitTable(){ const lat=parseFloat($("ac-lat")?.value); const lon=parseFloat($("ac-lon")?.value); if(!isFinite(lat)||!isFinite(lon)){ setStatus('经纬度无效'); return;} setStatus('生成中...'); setTimeout(()=>{ ensureUnitSunCache(lat,lon); renderUnitTable(); setStatus('单元日照表完成'); draw(); }, 30); }
  function renderUnitTable(){ const host=$("ac-unit-table"); if(!host) return; if(!unitSunCache){ host.textContent='(空)'; return;} const lines=['BID\tFloor\tUnit\t春分h\t夏至h\t秋分h\t冬至h\t年度h']; Object.keys(unitSunCache).forEach(bid=>{ const floors=unitSunCache[bid]; Object.keys(floors).forEach(fl=>{ const units=floors[fl]; Object.keys(units).forEach(u=>{ const r=units[u]; lines.push(`${bid}\t${fl}\t${u}\t${r.spring.toFixed(2)}\t${r.summer.toFixed(2)}\t${r.autumn.toFixed(2)}\t${r.winter.toFixed(2)}\t${r.annual.toFixed(2)}`); }); }); }); host.textContent=lines.join('\n'); }
  function exportAllCsv(){ if(!unitSunCache){ setStatus('请先生成单元日照表'); return;} const rows=['BuildingId,Floor,Unit,SpringHours,SummerHours,AutumnHours,WinterHours,AnnualAvgHours']; Object.keys(unitSunCache).forEach(bid=>{ const floors=unitSunCache[bid]; Object.keys(floors).forEach(fl=>{ const units=floors[fl]; Object.keys(units).forEach(u=>{ const r=units[u]; rows.push(`${bid},${fl},${u},${r.spring.toFixed(2)},${r.summer.toFixed(2)},${r.autumn.toFixed(2)},${r.winter.toFixed(2)},${r.annual.toFixed(2)}`); }); }); }); downloadText('sunshine_units.csv', rows.join('\n')); }
  function exportBuildingsJson(){ const data=JSON.stringify({version:1, scaleMetersPerCell, buildings}, null,2); downloadText('buildings.json', data); }
  function importBuildingsJson(ev){ const f=ev.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ try{ const obj=JSON.parse(reader.result); if(obj.buildings){ buildings=obj.buildings; nextId=buildings.reduce((m,b)=>Math.max(m,b.id),0)+1; updateBuildingList(); updateTargetBuildingSelect(); unitSunCache=null; setStatus('导入成功'); draw(); } }catch(ex){ setStatus('导入失败'); } }; reader.readAsText(f); ev.target.value=''; }
  function downloadText(name,text){ const blob=new Blob([text],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },150); }

  global.AC = AC;
})(window);
