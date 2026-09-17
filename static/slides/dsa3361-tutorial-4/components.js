// Animation logic adapted from the Tutorial 4 article.

(function () {
  const svg = document.getElementById('regression-demo-plot');
  const collectTimeButton = document.getElementById('collect-time-btn');
  const measureHeightButton = document.getElementById('measure-height-btn');
  const inevitableErrorButton = document.getElementById('inevitable-error-btn');
  const fitButton = document.getElementById('fit-line-btn');
  const restartButton = document.getElementById('restart-btn');
  if (!svg || !collectTimeButton || !measureHeightButton || !inevitableErrorButton || !fitButton || !restartButton) return;

  const ns = 'http://www.w3.org/2000/svg';
  const margin = { top: 38, right: 28, bottom: 62, left: 70 };
  const width = 760;
  const height = 470;
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const xMax = 8;
  const yMax = 45;
  const trueSlope = 4.9;
  const targetCount = 24;
  const densityScale = 95 * 2;
  const densityLift = 2.2;
  const errorStandardDeviation = 1.35 * Math.sqrt(2) * 1.5;
  let currentData = [];
  let currentFit = null;
  let experimentNumber = 0;
  let stage = 'initial';
  let trueLineOpacity = 0;
  let fittedProgress = 0;
  let animationToken = 0;
  let sceneOpacity = 1;
  let densityOpacity = 1;

  function themeColours() {
    const dark = document.documentElement.style.colorScheme === 'dark';
    return dark
      ? { background: '#17181f', axis: '#cbd5e1', text: '#e2e8f0', grid: '#334155', point: '#f8fafc', density: '#94a3b8', trueLine: '#f8fafc' }
      : { background: '#ffffff', axis: '#334155', text: '#1e293b', grid: '#e2e8f0', point: '#111827', density: '#64748b', trueLine: '#111827' };
  }

  function element(name, attributes) {
    const node = document.createElementNS(ns, name);
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }

  function addText(parent, x, y, text, attributes) {
    const node = element('text', Object.assign({ x: x, y: y }, attributes || {}));
    node.textContent = text;
    parent.appendChild(node);
    return node;
  }

  function xScale(x) { return margin.left + (x / xMax) * plotWidth; }
  function yScale(y) { return height - margin.bottom - (y / yMax) * plotHeight; }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return function () { value = (1664525 * value + 1013904223) >>> 0; return value / 4294967296; };
  }

  function normalRandom(random) {
    const u = Math.max(random(), 1e-12);
    const v = Math.max(random(), 1e-12);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function normalDensity(x, mean, standardDeviation) {
    const z = (x - mean) / standardDeviation;
    return Math.exp(-0.5 * z * z) / (standardDeviation * Math.sqrt(2 * Math.PI));
  }

  function makeData() {
    experimentNumber += 1;
    const random = seededRandom(3361 + experimentNumber * 7919);
    const data = [];
    while (data.length < targetCount) {
      const x = 4 + 2 * normalRandom(random);
      if (x < 0 || x > xMax) continue;
      data.push({ x: x, trueY: trueSlope * x, error: normalRandom(random) * errorStandardDeviation, y: 0 });
    }
    data.sort(function (a, b) { return a.x - b.x; });
    return data;
  }

  function fitLine(data) {
    const xMean = data.reduce(function (sum, point) { return sum + point.x; }, 0) / data.length;
    const yMean = data.reduce(function (sum, point) { return sum + point.y; }, 0) / data.length;
    const numerator = data.reduce(function (sum, point) { return sum + (point.x - xMean) * (point.y - yMean); }, 0);
    const denominator = data.reduce(function (sum, point) { return sum + Math.pow(point.x - xMean, 2); }, 0);
    const slope = numerator / denominator;
    return { intercept: yMean - slope * xMean, slope: slope };
  }

  function easeOutCubic(progress) { return 1 - Math.pow(1 - progress, 3); }

  function drawAxes() {
    const colours = themeColours();
    const axes = element('g', { 'font-family': 'system-ui, sans-serif' });
    axes.appendChild(element('line', { x1: margin.left, y1: height - margin.bottom, x2: width - margin.right, y2: height - margin.bottom, stroke: colours.axis, 'stroke-width': 1.5 }));
    axes.appendChild(element('line', { x1: margin.left, y1: margin.top, x2: margin.left, y2: height - margin.bottom, stroke: colours.axis, 'stroke-width': 1.5 }));
    for (let tick = 0; tick <= 8; tick += 2) {
      const x = xScale(tick);
      axes.appendChild(element('line', { x1: x, y1: height - margin.bottom, x2: x, y2: height - margin.bottom + 6, stroke: colours.axis }));
      addText(axes, x, height - margin.bottom + 24, String(tick), { 'text-anchor': 'middle', fill: colours.text, 'font-size': 20 });
    }
    for (let tick = 0; tick <= 40; tick += 10) {
      const y = yScale(tick);
      axes.appendChild(element('line', { x1: margin.left - 6, y1: y, x2: margin.left, y2: y, stroke: colours.axis }));
      addText(axes, margin.left - 12, y + 4, String(tick), { 'text-anchor': 'end', fill: colours.text, 'font-size': 20 });
      if (tick > 0) axes.appendChild(element('line', { x1: margin.left, y1: y, x2: width - margin.right, y2: y, stroke: colours.grid, 'stroke-width': 1, opacity: 0.8 }));
    }
    addText(axes, margin.left + plotWidth / 2, height - 15, 'x = time² (s²)', { 'text-anchor': 'middle', fill: colours.text, 'font-size': 20, 'font-weight': 600 });
    addText(axes, 18, margin.top + plotHeight / 2, 'y = height (m)', { transform: 'rotate(-90 18 ' + (margin.top + plotHeight / 2) + ')', 'text-anchor': 'middle', fill: colours.text, 'font-size': 20, 'font-weight': 600 });
    svg.appendChild(axes);
  }

  function drawDensity(parent) {
    const colours = themeColours();
    let path = '';
    for (let x = 0; x <= xMax; x += 0.08) {
      const y = normalDensity(x, 4, 2) * densityScale;
      path += (path ? ' L ' : 'M ') + xScale(x) + ' ' + yScale(y);
    }
    parent.appendChild(element('path', { d: path, fill: 'none', stroke: colours.density, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: densityOpacity * 0.85 }));
  }

  function drawLegend() {
    const colours = themeColours();
    const legend = element('g', { 'font-family': 'system-ui, sans-serif', opacity: stage === 'initial' ? densityOpacity : sceneOpacity });
    let y = margin.top + 8;
    function lineItem(colour, label, dashed, opacity) {
      legend.appendChild(element('line', { x1: width - 310, y1: y - 4, x2: width - 290, y2: y - 4, stroke: colour, 'stroke-width': 3, 'stroke-dasharray': dashed ? '8 6' : '', opacity: opacity === undefined ? 1 : opacity }));
      addText(legend, width - 281, y, label, { fill: colours.text, 'font-size': 20 });
      y += 22;
    }
    if (stage === 'initial') lineItem(colours.density, 'Distribution of x', false, 0.85);
    if (currentData.length) {
      legend.appendChild(element('circle', { cx: width - 306, cy: y - 4, r: 4, fill: colours.point }));
      addText(legend, width - 295, y, 'Observed points', { fill: colours.text, 'font-size': 20 });
      y += 22;
    }
    if (trueLineOpacity > 0) lineItem(colours.trueLine, 'True relation', false, trueLineOpacity);
    if (currentFit) lineItem('#dc2626', 'Fitted line', true, 1);
    svg.appendChild(legend);
  }

  function drawPlot() {
    const colours = themeColours();
    while (svg.lastChild && svg.lastChild.tagName !== 'title' && svg.lastChild.tagName !== 'desc') svg.removeChild(svg.lastChild);
    svg.appendChild(element('rect', { x: 0, y: 0, width: width, height: height, fill: colours.background, rx: 8 }));
    drawAxes();
    const content = element('g', { 'font-family': 'system-ui, sans-serif' });
    if (stage === 'initial') drawDensity(content);
    currentData.forEach(function (point) {
      content.appendChild(element('circle', { cx: xScale(point.x), cy: yScale(point.y), r: 4.5, fill: colours.point, opacity: sceneOpacity * 0.85 }));
    });
    if (trueLineOpacity > 0) {
      content.appendChild(element('line', { x1: xScale(0), y1: yScale(0), x2: xScale(xMax), y2: yScale(trueSlope * xMax), stroke: colours.trueLine, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: trueLineOpacity * sceneOpacity }));
    }
    if (currentFit) {
      const startX = Math.max(0, Math.min(xMax, -currentFit.intercept / currentFit.slope));
      const endX = Math.min(xMax, Math.max(startX, (yMax - currentFit.intercept) / currentFit.slope));
      const visibleX = startX + (endX - startX) * fittedProgress;
      const visibleY = currentFit.intercept + currentFit.slope * visibleX;
      content.appendChild(element('line', { x1: xScale(startX), y1: yScale(Math.max(0, currentFit.intercept + currentFit.slope * startX)), x2: xScale(visibleX), y2: yScale(Math.max(0, visibleY)), stroke: '#dc2626', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-dasharray': '9 6', opacity: sceneOpacity }));
    }
    svg.appendChild(content);
    drawLegend();
    if (currentFit) {
      const intercept = (currentFit.intercept < 0 ? '-' : '') + Math.abs(currentFit.intercept).toFixed(2);
      const slopeSign = currentFit.slope >= 0 ? '+' : '-';
      const equationGroup = element('g', { 'font-family': 'system-ui, sans-serif', opacity: sceneOpacity });
      addText(equationGroup, width - 28, margin.top + 145, 'Fitted equation', { 'text-anchor': 'end', fill: colours.text, 'font-size': 14, 'font-weight': 600 });
      addText(equationGroup, width - 28, margin.top + 177, 'ŷ = ' + intercept + ' ' + slopeSign + ' ' + Math.abs(currentFit.slope).toFixed(2) + 'x', { 'text-anchor': 'end', fill: '#dc2626', 'font-size': 20, 'font-weight': 700 });
      svg.appendChild(equationGroup);
    }
  }

  function setButton(button, visible) { button.style.display = visible ? 'inline-block' : 'none'; }

  function animatePoints(target, onComplete, lineStart, lineEnd, durationOverride, easingOverride, trajectoryOverride) {
    animationToken += 1;
    const token = animationToken;
    const starts = currentData.map(function (point) { return point.y; });
    const startTime = performance.now();
    const duration = durationOverride || 900;
    const easing = easingOverride || easeOutCubic;
    function frame(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = easing(progress);
      currentData.forEach(function (point, index) {
        point.y = trajectoryOverride
          ? trajectoryOverride(point, starts[index], progress, eased)
          : starts[index] + (target(point) - starts[index]) * eased;
      });
      if (lineStart !== undefined && lineEnd !== undefined) trueLineOpacity = lineStart + (lineEnd - lineStart) * eased;
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      } else {
        currentData.forEach(function (point) { point.y = target(point); });
        if (lineEnd !== undefined) trueLineOpacity = lineEnd;
        drawPlot();
        onComplete();
      }
    }
    window.requestAnimationFrame(frame);
  }

  function animateFittedLine() {
    animationToken += 1;
    const token = animationToken;
    const startTime = performance.now();
    const duration = 1100;
    fittedProgress = 0;
    function frame(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - startTime) / duration);
      fittedProgress = easeOutCubic(progress);
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(frame);
      }
    }
    window.requestAnimationFrame(frame);
  }

  function collectTime() {
    animationToken += 1;
    currentData = makeData();
    currentData.forEach(function (point) {
      point.densityY = normalDensity(point.x, 4, 2) * densityScale;
      point.y = point.densityY;
    });
    currentFit = null;
    fittedProgress = 0;
    trueLineOpacity = 0;
    stage = 'initial';
    sceneOpacity = 1;
    densityOpacity = 1;
    setButton(collectTimeButton, false);
    setButton(measureHeightButton, false);
    setButton(inevitableErrorButton, false);
    setButton(fitButton, false);
    setButton(restartButton, false);
    drawPlot();
    animatePoints(function (point) {
      return point.densityY;
    }, function () {
      const pauseToken = animationToken;
      window.setTimeout(function () {
        if (pauseToken !== animationToken) return;
        stage = 'times';
        densityOpacity = 0;
        drawPlot();
        animatePoints(function () { return 0; }, function () {
          setButton(measureHeightButton, true);
        });
      }, 300);
    }, undefined, undefined, 700, easeOutCubic, function (point, start, progress) {
      return point.densityY + densityLift * Math.sin(Math.PI * progress);
    });
  }

  function measureHeight() {
    setButton(measureHeightButton, false);
    stage = 'height';
    animatePoints(function (point) { return point.trueY; }, function () {
      setButton(inevitableErrorButton, true);
    }, 0, 0.42);
  }

  function addInevitableError() {
    setButton(inevitableErrorButton, false);
    stage = 'error';
    animatePoints(function (point) { return point.trueY + point.error; }, function () {
      setButton(fitButton, true);
    }, 0.42, 0.16);
  }

  function fitLineNow() {
    setButton(fitButton, false);
    currentFit = fitLine(currentData);
    fittedProgress = 0;
    stage = 'fitted';
    setButton(restartButton, true);
    animateFittedLine();
  }

  function restart() {
    animationToken += 1;
    const token = animationToken;
    const fadeOutDuration = 650;
    const fadeInDuration = 650;
    const fadeOutStart = performance.now();
    sceneOpacity = 1;
    densityOpacity = 0;
    setButton(collectTimeButton, false);
    setButton(measureHeightButton, false);
    setButton(inevitableErrorButton, false);
    setButton(fitButton, false);
    setButton(restartButton, false);

    function fadeInDensity() {
      const fadeInStart = performance.now();
      function frame(now) {
        if (token !== animationToken) return;
        const progress = Math.min(1, (now - fadeInStart) / fadeInDuration);
        sceneOpacity = 0;
        densityOpacity = easeOutCubic(progress);
        drawPlot();
        if (progress < 1) {
          window.requestAnimationFrame(frame);
        } else {
          sceneOpacity = 1;
          densityOpacity = 1;
          setButton(collectTimeButton, true);
          drawPlot();
        }
      }
      window.requestAnimationFrame(frame);
    }

    function fadeOutScene(now) {
      if (token !== animationToken) return;
      const progress = Math.min(1, (now - fadeOutStart) / fadeOutDuration);
      sceneOpacity = 1 - easeOutCubic(progress);
      densityOpacity = 0;
      drawPlot();
      if (progress < 1) {
        window.requestAnimationFrame(fadeOutScene);
      } else {
        currentData = [];
        currentFit = null;
        fittedProgress = 0;
        trueLineOpacity = 0;
        stage = 'initial';
        sceneOpacity = 0;
        densityOpacity = 0;
        drawPlot();
        fadeInDensity();
      }
    }

    window.requestAnimationFrame(fadeOutScene);
  }

  collectTimeButton.addEventListener('click', collectTime);
  measureHeightButton.addEventListener('click', measureHeight);
  inevitableErrorButton.addEventListener('click', addInevitableError);
  fitButton.addEventListener('click', fitLineNow);
  restartButton.addEventListener('click', restart);
  const themeObserver = new MutationObserver(function (mutations) { if (mutations.some(function (mutation) { return mutation.attributeName === 'style'; })) drawPlot(); });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  drawPlot();
}());


(function () {
  const root = document.getElementById('plotting-steps');
  const svg = root.querySelector('svg');
  const button = root.querySelector('button');
  const codeRoot = document.getElementById('plotting-code');
  const codeLines = [...codeRoot.querySelectorAll('.line')];
  let busy = false;
  function updateCode() {
    codeLines.forEach((line,i) => {
      const active = i === step;
      line.classList.add('plotting-code-step');
      line.classList.toggle('active',active);
      line.setAttribute('role','button');
      line.setAttribute('tabindex',active && !busy ? '0' : '-1');
      line.setAttribute('aria-disabled',String(!active || busy));
      line.setAttribute('aria-label','Animate: '+line.textContent.trim());
    });
    button.hidden = step !== codeLines.length;
  }
  // First eight observations from np.random.seed(123); fitted using all 100.
  const xs = [-1.0856306033,.9973454466,.2829784981,-1.5062947139,-.5786002520,1.6514365371,-2.4266792434,-.4289126289];
  const ys = [-1.221787957,-1.490271242,-.502378433,-.453995393,-1.301613117,-.157210667,-2.123564879,-2.145444170];
  const rows = xs.map((x,i) => ({i,x,y:ys[i],pred:-1.0095428767+.4917037270*x}));
  const order = rows.map(r=>r.i).sort((a,b)=>xs[a]-xs[b]);
  const ns = 'http://www.w3.org/2000/svg';
  const px = x => 575+(x+3)/5*350;
  const py = y => 350-(y+3)/4*290;
  const ry = i => 104+i*34;
  let step = 0;
  let observed, predictions, curve, source, indices, rowGroups, xHeader, yHeader;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function el(tag, attrs={}, parent=svg) {
    const n=document.createElementNS(ns,tag);
    Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v)); parent.appendChild(n); return n;
  }
  function text(parent,x,y,value,attrs={}) {
    const n=el('text',{x,y,...attrs},parent); n.textContent=value; return n;
  }
  function tween(duration,update) {
    if(reduced.matches) { update(1); return Promise.resolve(); }
    return new Promise(resolve=>{
      const start=performance.now();
      function frame(now) { const p=Math.min(1,(now-start)/duration); update(p); if(p<1) requestAnimationFrame(frame); else resolve(); }
      requestAnimationFrame(frame);
    });
  }
  function ease(p) { return 1-Math.pow(1-p,3); }
  function table(parent) {
    el('rect',{x:10,y:16,width:450,height:347,rx:12,fill:'var(--pd-panel)',opacity:.55},parent);
    text(parent,22,42,'Original rows',{'font-weight':600,'data-table-title':''});
    text(parent,22,76,'index');
    xHeader=text(parent,133,76,'x');
    yHeader=text(parent,275,76,'y',{'data-y-header':''});
    el('line',{x1:22,y1:84,x2:430,y2:84,stroke:'var(--pd-grid)','stroke-width':1.5},parent);
    rowGroups=rows.map((r,j)=>{
      const group=el('g',{'data-row-index':r.i},parent);
      el('rect',{x:14,y:ry(j)-24,width:442,height:34,rx:5,fill:'var(--pd-panel)',opacity:(j%2===0 ? 0.34 : 0.14)},group);
      el('line',{x1:22,y1:ry(j)+9,x2:430,y2:ry(j)+9,stroke:'var(--pd-grid)'},group);
      text(group,22,ry(j),r.i);
      text(group,133,ry(j),r.x.toFixed(2));
      text(group,275,ry(j),r.y.toFixed(2),{'data-y-cell':j});
      return group;
    });
  }
  function reset() {
    svg.replaceChildren(); step=0;
    source=el('g',{'class':'plotting-table'}); table(source);
    const axes=el('g');
    el('line',{x1:575,y1:350,x2:925,y2:350,stroke:'var(--pd-text)'},axes);
    el('line',{x1:575,y1:60,x2:575,y2:350,stroke:'var(--pd-text)'},axes);
    for(let x=-3;x<=2;x++) { text(axes,px(x),373,x,{'text-anchor':'middle'}); }
    for(let y=-3;y<=1;y++) {
      el('line',{x1:575,y1:py(y),x2:925,y2:py(y),stroke:'var(--pd-grid)'},axes);
      text(axes,564,py(y)+4,y,{'text-anchor':'end'});
    }
    text(axes,750,401,'x',{'text-anchor':'middle'}); text(axes,547,48,'y');
    observed=el('g'); curve=el('g'); predictions=el('g');
    busy=false; button.disabled=false; updateCode();

  }
  async function fly(r, x0, y0, isPrediction, delay=0) {
    if(delay && !reduced.matches) await new Promise(resolve=>setTimeout(resolve,delay));
    const g=el('g');
    const label=text(g,0,0,`(${r.x.toFixed(2)}, ${(isPrediction?r.pred:r.y).toFixed(2)})`,{'text-anchor':'middle'});
    const dot=el('circle',{r:4.5,fill:isPrediction?'none':'var(--pd-point)',stroke:isPrediction?'var(--pd-accent)':'none','stroke-width':2,opacity:0},g);
    const x1=px(r.x),y1=py(isPrediction?r.pred:r.y);
    await tween(850,p=>{
      const e=ease(p);
      g.setAttribute('transform',`translate(${x0+(x1-x0)*e},${y0+(y1-y0)*e-24*Math.sin(Math.PI*p)})`);
      label.setAttribute('opacity',Math.max(0,1-p*1.7)); dot.setAttribute('opacity',Math.min(1,p*1.7));
    });
    (isPrediction?predictions:observed).appendChild(g);
  }
  async function next() {
    if(busy) return;
    busy=true; button.disabled=true; updateCode();
    if(step===0) {

      await Promise.all(rows.map((r,i)=>fly(r,240,ry(i),false,i*65)));
    } else if(step===1) {
      const cells=[source.querySelector('[data-y-header]'),...source.querySelectorAll('[data-y-cell]')];
      const incoming=[];
      const header=text(source,275,76,'y_pred'); incoming.push(header); yHeader=header;
      rows.forEach((r,i)=>incoming.push(text(rowGroups[i],275,ry(i),r.pred.toFixed(2))));
      await tween(650,p=>{
        cells.forEach(n=>{n.setAttribute('transform',`translate(${-35*ease(p)},0)`);n.setAttribute('opacity',1-p);});
        incoming.forEach(n=>{n.setAttribute('transform',`translate(${65*(1-ease(p))},0)`); n.setAttribute('opacity',p);});
      }); cells.forEach(n=>n.remove());

    } else if(step===2) {
      indices=el('g',{'class':'plotting-table'}); text(indices,470,76,'order');
      order.forEach((idx,j)=>text(indices,485,ry(j),idx));
      await tween(500,p=>{indices.setAttribute('opacity',p);indices.setAttribute('transform',`translate(${12*(1-ease(p))},0)`);});

    } else if(step===3) {
      const ranks = rows.map(r=>order.indexOf(r.i));
      await tween(1200,p=>{
        rowGroups.forEach((group,i)=>{
          const dy=(ry(ranks[i])-ry(i))*ease(p);
          group.setAttribute('transform',`translate(0,${dy})`);
        });
      });
      source.querySelector('[data-table-title]').textContent='Sorted rows';
      xHeader.textContent='x[order]'; yHeader.textContent='y_pred[order]';
      await tween(400,p=>indices.setAttribute('opacity',1-p));
      indices.remove();

    } else if(step===4) {

      // Staggered launches preserve the top-to-bottom row sequence.
      await Promise.all(order.map((idx,j)=>fly(rows[idx],240,ry(j),true,j*220)));

      const first=rows[order[0]],last=rows[order[7]];
      const line=el('line',{x1:px(first.x),y1:py(first.pred),x2:px(first.x),y2:py(first.pred),stroke:'var(--pd-accent)','stroke-width':2.5,'stroke-dasharray':'8 5'},curve);
      await tween(1100,p=>{ const e=ease(p);line.setAttribute('x2',px(first.x)+(px(last.x)-px(first.x))*e);line.setAttribute('y2',py(first.pred)+(py(last.pred)-py(first.pred))*e); });
      text(svg,575,25,'● Observed data'); text(svg,755,25,'○ Fitted line',{style:'fill:var(--pd-accent)'});

    } else if(step===5) {
      const first=rows[order[0]],last=rows[order[7]];
      const trueY=x=>-1+0.5*x;
      const line=el('line',{x1:px(first.x),y1:py(trueY(first.x)),x2:px(first.x),y2:py(trueY(first.x)),stroke:'#2563eb','stroke-width':2.5,'data-population-line':''},curve);
      await tween(1100,p=>{const e=ease(p);line.setAttribute('x2',px(first.x)+(px(last.x)-px(first.x))*e);line.setAttribute('y2',py(trueY(first.x))+(py(trueY(last.x))-py(trueY(first.x)))*e);});
      text(svg,575,48,'━ Population line',{style:'fill:#2563eb'});
      text(svg,22,399,'The true line: y = −1 + 0.5x.',{style:'fill:#2563eb'});

    } else { reset(); return; }
    step++; busy=false; button.disabled=false; updateCode();
  }
  codeLines.forEach((line,i) => {
    line.addEventListener('click',()=>{if(i===step && !busy) next();});
    line.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ') && i===step && !busy) {event.preventDefault();next();}});
  });
  button.addEventListener('click',next); reset();
}());


(function () {
  const workspace = document.getElementById('plotting-workspace');
  const copy = document.getElementById('plotting-copy-all');
  copy.addEventListener('click', async function () {
    const code = [...workspace.querySelectorAll('pre code')].map(block => (block.querySelector('.line') ? [...block.querySelectorAll('.line')].map(line => line.textContent).join('\n') : block.textContent).trimEnd()).join('\n\n') + '\n';
    try {
      await navigator.clipboard.writeText(code);
      copy.textContent = 'Copied!';
    } catch (error) {
      const field = document.createElement('textarea');
      field.value = code;
      field.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand('copy');
      field.remove();
      copy.focus();
      copy.textContent = copied ? 'Copied!' : 'Copy failed — try again';
    }
    window.setTimeout(() => { copy.textContent = 'Copy code'; }, 2000);
  });
}());


(() => {
  const root = document.getElementById('quadratic-curvature-demo');
  const originalData = [[-1.0856306033005612,-1.2217879570143648],[0.9973454465835858,-1.4902712424684315],[0.28297849805199204,-0.5023784332387449],[-1.5062947139180922,-0.45399539332438876],[-0.5786002519685364,-1.3016131167000078],[1.651436537097151,-0.15721066699650474],[-2.426679243393074,-2.1235648793771977],[-0.42891262885617726,-2.1454441698239823],[1.2659362587055338,-0.15395855080207813],[-0.8667404022651016,-2.236075073140533],[-0.6788861516220543,-1.5532828748729295],[-0.09470896893689112,-0.4259197096665769],[1.4913896261242878,-0.6219136649878942],[-0.638901996684651,-1.0688265035586255],[-0.44398195964606546,-0.7156214528448476],[-0.43435127561851733,-1.0778052097612587],[2.205930082725455,-0.5825091936845764],[2.1867860889737862,-0.07284459318881384],[1.004053897878877,0.48173262013358153],[0.386186399174856,-1.8194296819113074],[0.7373685758962422,-0.7692087189849666],[1.490732028150799,-0.5306880216686543],[-0.9358338684023914,-1.4075432526526264],[1.1758290447821034,-0.03797766901533295],[-1.2538806677490124,-0.8225948498634794],[-0.6377515024534103,-1.453991947231284],[0.9071051958003014,-0.14027673711143912],[-1.4286807002259692,-1.4644702776803982],[-0.1400687201886661,-0.8328607111584327],[-0.8617548958596855,-1.712839413693079],[-0.2556193705305969,-1.6264704196532487],[-2.7985891054607244,-2.9493161090407107],[-1.771533104509847,-2.263985156954485],[-0.6998772345979173,-1.1890953293658453],[0.9274624317585825,-0.155794087556544],[-0.1736356827902158,-0.9250834174666603],[0.0028459158968110196,-1.273054590149465],[0.688222711102285,0.24709641051737974],[-0.8795363430090519,-0.6803353596887561],[0.283627323807291,-1.0351863944714412],[-0.8053665180656158,-1.8143989620256407],[-1.7276694941206072,-1.7987272699813188],[-0.390899793755101,-0.561800574350374],[0.5738058624050577,-0.5467145801704126],[0.3385890509998015,-0.5524311220450773],[-0.01183049447881976,-1.1119553083772227],[2.392365265937726,0.42431808056997833],[0.4129121603087788,-0.021271694117541373],[0.9787360059373466,-0.6304663877701823],[2.2381433384979528,0.19072553550291277],[-1.2940853231612488,-1.5201344233058107],[-1.0387882102049535,-1.377531427216958],[1.7437122251229307,-0.8340883254741484],[-0.7980627352410625,-2.3374656955574786],[0.029683230303330227,-1.4949859203092544],[1.0693159694243488,-0.3813708675869915],[0.8907063912931706,-0.27771872135180903],[1.754886181981109,-0.3878941888962576],[1.4956441370334692,0.436450809950388],[1.0693926697057368,-0.5368916523102252],[-0.7727087142471915,-1.3761963580062835],[0.7948626677932181,-0.6995506013797221],[0.31427199450686705,-0.7758506063732339],[-1.326265459940456,-1.3108956929484261],[1.4172990464768525,0.04147624219459184],[0.8072365345785665,-1.045593203015512],[0.045490080631097156,-0.21542307144518769],[-0.2330920609844135,-1.6640592592056656],[-1.198301144700787,-1.5595370653050873],[0.19952407355863258,-1.0374362499818601],[0.46843911944564426,-1.2902762789364215],[-0.8311549842432792,-1.4531377861085553],[1.1622040490995293,-0.7893048620964345],[-1.0972030464830342,-1.512147901603491],[-2.1231003500424417,-1.8600071944115375],[1.0397270908927005,0.25582822993298604],[-0.4033660381021075,-1.0479909097373463],[-0.12602958531301514,-1.3686274628089201],[-0.8375167228250533,-1.6145682667723273],[-1.6059627607174027,-1.7329923273014196],[1.2552373747242185,-0.3256508979068152],[-0.6888689838469215,-0.6146398578092502],[1.6609524881479396,0.5281527089524471],[0.8073081862107286,-0.7758138700157664],[-0.31475814671745994,-1.431700137451829],[-1.0859024011268665,-2.8214785025973628],[-0.732461986720457,-1.6406912000213387],[-1.2125231310951696,-2.0952904185897268],[2.0871133595881854,-0.13385554925331664],[0.16444123022982496,-0.721987263710032],[1.1502055425466322,-0.33630106412718996],[-1.2673520490102275,-1.648660028028885],[0.18103512959700385,-0.8096913796572413],[1.177861938808578,-0.47412791721120684],[-0.335010761933016,-1.0689959146947698],[1.0311144589217425,-2.099970274498785],[-1.0845679120057665,-1.6769307008782606],[-1.363471544618584,-1.7371611328357957],[0.37940061207813613,-0.9809305520642249],[-0.3791764345725522,-1.298561348337747]];
  const ns = 'http://www.w3.org/2000/svg';
  const sx = x => 64 + (x + 3) / 6 * 666;
  const sy = y => 400 - (y + 7) / 12 * 345;
  function add(parent, tag, attrs, text) {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v));
    if (text !== undefined) el.textContent = text;
    parent.append(el); return el;
  }
  const axes = root.querySelector('#curve-axes');
  for (let y=-6; y<=4; y+=2) {
    add(axes,'line',{x1:64,x2:730,y1:sy(y),y2:sy(y),stroke:'currentColor',opacity:.12});
    add(axes,'text',{x:53,y:sy(y)+7,'text-anchor':'end',fill:'currentColor','font-size':23},y);
  }
  for (let x=-3;x<=3;x++) add(axes,'text',{x:sx(x),y:424,'text-anchor':'middle',fill:'currentColor','font-size':23},x);
  add(axes,'path',{d:'M64 55V400H730',fill:'none',stroke:'currentColor',opacity:.65});
  add(axes,'text',{x:397,y:451,'text-anchor':'middle',fill:'currentColor','font-size':26},'x');
  add(axes,'text',{x:22,y:230,'text-anchor':'middle',fill:'currentColor','font-size':26},'y');
  const points = root.querySelector('#curve-points');
  let variance = 0.25;
  function fitQuadratic(data) {
    const matrix = Array.from({length:3},()=>Array(4).fill(0));
    data.forEach(([x,y]) => {
      const row=[1,x,x*x];
      for (let i=0;i<3;i++) {
        for (let j=0;j<3;j++) matrix[i][j] += row[i]*row[j];
        matrix[i][3] += row[i]*y;
      }
    });
    for (let col=0;col<3;col++) {
      let pivot=col;
      for (let row=col+1;row<3;row++) if (Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col])) pivot=row;
      [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
      const divisor=matrix[col][col];
      for (let j=col;j<4;j++) matrix[col][j]/=divisor;
      for (let row=0;row<3;row++) if (row!==col) {
        const factor=matrix[row][col];
        for (let j=col;j<4;j++) matrix[row][j]-=factor*matrix[col][j];
      }
    }
    return matrix.map(row=>row[3]);
  }
  function normal() {
    const u=Math.max(Number.EPSILON,Math.random());
    const v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  }
  function curve(beta) {
    return Array.from({length:241},(_,i) => {
      const x=-3+i/40;
      const y=beta[0]+beta[1]*x+beta[2]*x*x;
      return `${i?'L':'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`;
    }).join(' ');
  }
  function signed(value) {
    return `${value<0?'−':'+'} ${Math.abs(value).toFixed(4)}`;
  }
  function render(data) {
    const beta=fitQuadratic(data);
    points.replaceChildren();
    data.forEach(([x,y])=>add(points,'circle',{cx:sx(x),cy:sy(y),r:3.3,fill:'currentColor',opacity:.75}));
    katex.render(`\\operatorname{Var}(\\epsilon)=${variance.toFixed(4)}`, root.querySelector('#curve-variance'), {throwOnError: true});
    katex.render(`\\hat\\beta_2=${beta[2].toFixed(4)}`, root.querySelector('#curve-b2-value'), {throwOnError: true});
    katex.render(`\\hat y=${beta[0].toFixed(4)}${signed(beta[1]).replace('−','-')}x${signed(beta[2]).replace('−','-')}x^2`, root.querySelector('#curve-equation'), {throwOnError: true});
    root.querySelector('#curve-adjusted').setAttribute('d',curve(beta));
  }
  function resample() {
    const data=originalData.map(([x])=>[x,-1+0.5*x+Math.sqrt(variance)*normal()]);
    render(data);
  }
  root.querySelector('#curve-reference').setAttribute('d',curve([-1,0.5,0]));
  root.querySelector('#curve-less-noise').addEventListener('click',()=>{variance=Math.max(0.03125,variance/2);resample();});
  root.querySelector('#curve-more-noise').addEventListener('click',()=>{variance=Math.min(2,variance*2);resample();});
  root.querySelector('#curve-reset').addEventListener('click',()=>{variance=0.25;render(originalData);});
  render(originalData);
})();
